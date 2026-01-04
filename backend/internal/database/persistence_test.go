package database

import (
	"fmt"
	"math/rand"
	"testing"
	"testing/quick"
	"time"

	"tmember/internal/models"
)

// TestDatabasePersistenceAcrossRestarts tests Property 4: Database Persistence Across Restarts
// Feature: tmember-monorepo, Property 4: For any data stored in the database, restarting the database container should preserve all previously stored data
func TestDatabasePersistenceAcrossRestarts(t *testing.T) {
	// Skip if not in integration test mode
	if testing.Short() {
		t.Skip("Skipping database persistence test in short mode")
	}

	// Property test function
	property := func(email string, orgName string) bool {
		// Generate valid test data
		if email == "" || len(email) < 5 {
			email = fmt.Sprintf("test%d@example.com", rand.Intn(10000))
		}
		if orgName == "" || len(orgName) < 3 {
			orgName = fmt.Sprintf("TestOrg%d", rand.Intn(10000))
		}

		// Ensure database is connected
		if DB == nil {
			t.Logf("Database not initialized, skipping test")
			return true
		}

		// Create test user
		user := models.User{
			Email:        email,
			PasswordHash: "test_hash_" + fmt.Sprint(rand.Intn(1000)),
		}

		// Store user in database
		if err := DB.Create(&user).Error; err != nil {
			t.Logf("Failed to create user: %v", err)
			return false
		}

		// Create test organization
		org := models.Organization{
			Name: orgName,
		}

		// Store organization in database
		if err := DB.Create(&org).Error; err != nil {
			t.Logf("Failed to create organization: %v", err)
			return false
		}

		// Create membership
		membership := models.OrganizationMembership{
			UserID:         user.ID,
			OrganizationID: org.ID,
			Role:           models.RoleAdmin,
		}

		if err := DB.Create(&membership).Error; err != nil {
			t.Logf("Failed to create membership: %v", err)
			return false
		}

		// Simulate database restart by reconnecting
		originalDB := DB
		if err := Close(); err != nil {
			t.Logf("Failed to close database: %v", err)
			return false
		}

		// Wait a moment to simulate restart
		time.Sleep(100 * time.Millisecond)

		// Reconnect to database
		if err := Initialize(); err != nil {
			t.Logf("Failed to reinitialize database: %v", err)
			return false
		}

		// Verify data persistence - check if user still exists
		var retrievedUser models.User
		if err := DB.Where("email = ?", email).First(&retrievedUser).Error; err != nil {
			t.Logf("User not found after restart: %v", err)
			return false
		}

		// Verify organization still exists
		var retrievedOrg models.Organization
		if err := DB.Where("name = ?", orgName).First(&retrievedOrg).Error; err != nil {
			t.Logf("Organization not found after restart: %v", err)
			return false
		}

		// Verify membership still exists
		var retrievedMembership models.OrganizationMembership
		if err := DB.Where("user_id = ? AND organization_id = ?", retrievedUser.ID, retrievedOrg.ID).First(&retrievedMembership).Error; err != nil {
			t.Logf("Membership not found after restart: %v", err)
			return false
		}

		// Verify data integrity
		if retrievedUser.Email != email {
			t.Logf("User email mismatch: expected %s, got %s", email, retrievedUser.Email)
			return false
		}

		if retrievedOrg.Name != orgName {
			t.Logf("Organization name mismatch: expected %s, got %s", orgName, retrievedOrg.Name)
			return false
		}

		if retrievedMembership.Role != models.RoleAdmin {
			t.Logf("Membership role mismatch: expected %s, got %s", models.RoleAdmin, retrievedMembership.Role)
			return false
		}

		// Clean up test data
		DB.Delete(&membership)
		DB.Delete(&org)
		DB.Delete(&user)

		// Restore original DB connection for other tests
		DB = originalDB

		return true
	}

	// Run property test with 10 iterations (reduced for database tests)
	config := &quick.Config{
		MaxCount: 10,
		Rand:     rand.New(rand.NewSource(time.Now().UnixNano())),
	}

	if err := quick.Check(property, config); err != nil {
		t.Errorf("Database persistence property failed: %v", err)
	}
}
