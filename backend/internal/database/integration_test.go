package database

import (
	"os"
	"testing"
	"time"

	"tmember/internal/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestDatabaseIntegration tests database connectivity, migration, and persistence
// Requirements: 9.1, 9.3, 9.4, 9.5
func TestDatabaseIntegration(t *testing.T) {
	// Skip if not running integration tests
	if os.Getenv("INTEGRATION_TEST") != "true" {
		t.Skip("Skipping integration test. Set INTEGRATION_TEST=true to run.")
	}

	// Set up test database configuration
	originalConfig := LoadConfig()
	testConfig := &Config{
		Host:            getEnvOrDefault("TEST_DB_HOST", "localhost"),
		Port:            getEnvOrDefault("TEST_DB_PORT", "3306"),
		User:            getEnvOrDefault("TEST_DB_USER", "tmember"),
		Password:        getEnvOrDefault("TEST_DB_PASSWORD", "password"),
		DBName:          getEnvOrDefault("TEST_DB_NAME", "tmember_test"),
		MaxIdleConns:    10,
		MaxOpenConns:    100,
		ConnMaxLifetime: time.Hour,
	}

	t.Run("Database Connection", func(t *testing.T) {
		db, err := Connect(testConfig)
		require.NoError(t, err, "Should connect to database successfully")
		require.NotNil(t, db, "Database connection should not be nil")

		// Test ping
		sqlDB, err := db.DB()
		require.NoError(t, err)
		err = sqlDB.Ping()
		assert.NoError(t, err, "Should be able to ping database")

		// Close connection
		err = sqlDB.Close()
		assert.NoError(t, err, "Should close connection without error")
	})

	t.Run("Database Connection Error Handling", func(t *testing.T) {
		// Test with invalid configuration
		invalidConfig := &Config{
			Host:            "invalid-host",
			Port:            "3306",
			User:            "invalid-user",
			Password:        "invalid-password",
			DBName:          "invalid-db",
			MaxIdleConns:    10,
			MaxOpenConns:    100,
			ConnMaxLifetime: time.Hour,
		}

		db, err := Connect(invalidConfig)
		assert.Error(t, err, "Should fail to connect with invalid configuration")
		assert.Nil(t, db, "Database connection should be nil on error")
	})

	t.Run("Database Migration", func(t *testing.T) {
		// Initialize database connection
		db, err := Connect(testConfig)
		require.NoError(t, err)
		defer func() {
			sqlDB, _ := db.DB()
			sqlDB.Close()
		}()

		// Set global DB for migration
		originalDB := DB
		DB = db
		defer func() { DB = originalDB }()

		// Run migration
		err = Migrate()
		assert.NoError(t, err, "Migration should complete without error")

		// Verify tables exist
		var tableCount int
		err = db.Raw("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ? AND table_name IN ('users', 'organizations', 'organization_memberships')", testConfig.DBName).Scan(&tableCount).Error
		assert.NoError(t, err)
		assert.Equal(t, 3, tableCount, "Should create all required tables")
	})

	t.Run("Data Persistence", func(t *testing.T) {
		// Initialize database connection
		db, err := Connect(testConfig)
		require.NoError(t, err)
		defer func() {
			sqlDB, _ := db.DB()
			sqlDB.Close()
		}()

		// Set global DB
		originalDB := DB
		DB = db
		defer func() { DB = originalDB }()

		// Run migration
		err = Migrate()
		require.NoError(t, err)

		// Create test user
		testUser := &models.User{
			Email:        "test@example.com",
			PasswordHash: "hashed_password",
		}

		err = db.Create(testUser).Error
		require.NoError(t, err, "Should create user successfully")
		require.NotZero(t, testUser.ID, "User should have an ID after creation")

		// Verify user exists
		var retrievedUser models.User
		err = db.Where("email = ?", "test@example.com").First(&retrievedUser).Error
		assert.NoError(t, err, "Should retrieve user successfully")
		assert.Equal(t, testUser.Email, retrievedUser.Email)
		assert.Equal(t, testUser.PasswordHash, retrievedUser.PasswordHash)

		// Create test organization
		testOrg := &models.Organization{
			Name: "Test Organization",
		}

		err = db.Create(testOrg).Error
		require.NoError(t, err, "Should create organization successfully")
		require.NotZero(t, testOrg.ID, "Organization should have an ID after creation")

		// Create membership
		testMembership := &models.OrganizationMembership{
			UserID:         testUser.ID,
			OrganizationID: testOrg.ID,
			Role:           "admin",
		}

		err = db.Create(testMembership).Error
		assert.NoError(t, err, "Should create membership successfully")

		// Verify foreign key relationships work
		var membershipCount int64
		err = db.Model(&models.OrganizationMembership{}).Where("user_id = ? AND organization_id = ?", testUser.ID, testOrg.ID).Count(&membershipCount).Error
		assert.NoError(t, err)
		assert.Equal(t, int64(1), membershipCount, "Should have one membership record")

		// Clean up test data
		db.Delete(testMembership)
		db.Delete(testOrg)
		db.Delete(testUser)
	})

	t.Run("Connection Pool Configuration", func(t *testing.T) {
		db, err := Connect(testConfig)
		require.NoError(t, err)
		defer func() {
			sqlDB, _ := db.DB()
			sqlDB.Close()
		}()

		sqlDB, err := db.DB()
		require.NoError(t, err)

		// Verify connection pool settings
		stats := sqlDB.Stats()
		assert.LessOrEqual(t, stats.Idle, testConfig.MaxIdleConns, "Idle connections should not exceed max")
		assert.LessOrEqual(t, stats.OpenConnections, testConfig.MaxOpenConns, "Open connections should not exceed max")
	})

	t.Run("Database Initialization with Retry Logic", func(t *testing.T) {
		// Test the Initialize function
		originalDB := DB
		DB = nil
		defer func() { DB = originalDB }()

		// Set test environment variables
		os.Setenv("DB_HOST", testConfig.Host)
		os.Setenv("DB_PORT", testConfig.Port)
		os.Setenv("DB_USER", testConfig.User)
		os.Setenv("DB_PASSWORD", testConfig.Password)
		os.Setenv("DB_NAME", testConfig.DBName)

		err := Initialize()
		assert.NoError(t, err, "Initialize should succeed with valid configuration")
		assert.NotNil(t, DB, "Global DB should be set after initialization")

		// Test connection
		err = Ping()
		assert.NoError(t, err, "Should be able to ping database after initialization")

		// Clean up
		Close()
	})

	// Restore original configuration
	_ = originalConfig
}

// TestDatabaseErrorHandling tests various error conditions
func TestDatabaseErrorHandling(t *testing.T) {
	t.Run("Ping with nil database", func(t *testing.T) {
		originalDB := DB
		DB = nil
		defer func() { DB = originalDB }()

		err := Ping()
		assert.Error(t, err, "Ping should fail with nil database")
		assert.Contains(t, err.Error(), "not initialized", "Error should mention initialization")
	})

	t.Run("Migration with nil database", func(t *testing.T) {
		originalDB := DB
		DB = nil
		defer func() { DB = originalDB }()

		err := Migrate()
		assert.Error(t, err, "Migration should fail with nil database")
		assert.Contains(t, err.Error(), "not initialized", "Error should mention initialization")
	})

	t.Run("TestConnection with nil database", func(t *testing.T) {
		originalDB := DB
		DB = nil
		defer func() { DB = originalDB }()

		err := TestConnection()
		assert.Error(t, err, "TestConnection should fail with nil database")
		assert.Contains(t, err.Error(), "not initialized", "Error should mention initialization")
	})

	t.Run("Close with nil database", func(t *testing.T) {
		originalDB := DB
		DB = nil
		defer func() { DB = originalDB }()

		err := Close()
		assert.NoError(t, err, "Close should not error with nil database")
	})
}

// getEnvOrDefault gets an environment variable with a fallback default value
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
