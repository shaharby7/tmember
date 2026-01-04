package database

import (
	"fmt"
	"log"

	"tmember/internal/models"
)

// Migrate runs database migrations for all models
func Migrate() error {
	if DB == nil {
		return fmt.Errorf("database connection is not initialized")
	}

	log.Println("Starting database migration...")

	// Auto-migrate all models
	err := DB.AutoMigrate(models.AllModels()...)
	if err != nil {
		return fmt.Errorf("failed to run database migrations: %w", err)
	}

	// Add additional constraints and indexes
	if err := addConstraints(); err != nil {
		return fmt.Errorf("failed to add database constraints: %w", err)
	}

	log.Println("Database migration completed successfully")
	return nil
}

// addConstraints adds additional database constraints that GORM might not handle automatically
func addConstraints() error {
	// Add unique constraint for user-organization membership
	if err := DB.Exec(`
		ALTER TABLE organization_memberships 
		ADD CONSTRAINT unique_user_organization 
		UNIQUE (user_id, organization_id)
	`).Error; err != nil {
		// Ignore error if constraint already exists
		log.Printf("Note: unique constraint may already exist: %v", err)
	}

	// Add foreign key constraints if they don't exist
	if err := DB.Exec(`
		ALTER TABLE organization_memberships 
		ADD CONSTRAINT fk_memberships_user 
		FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
	`).Error; err != nil {
		log.Printf("Note: foreign key constraint may already exist: %v", err)
	}

	if err := DB.Exec(`
		ALTER TABLE organization_memberships 
		ADD CONSTRAINT fk_memberships_organization 
		FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
	`).Error; err != nil {
		log.Printf("Note: foreign key constraint may already exist: %v", err)
	}

	return nil
}

// TestConnection tests the database connection and basic operations
func TestConnection() error {
	if DB == nil {
		return fmt.Errorf("database connection is not initialized")
	}

	// Test basic connectivity
	if err := Ping(); err != nil {
		return fmt.Errorf("database ping failed: %w", err)
	}

	// Test a simple query
	var result struct {
		Version string
	}

	if err := DB.Raw("SELECT VERSION() as version").Scan(&result).Error; err != nil {
		return fmt.Errorf("failed to execute test query: %w", err)
	}

	log.Printf("Database connection test successful. MySQL version: %s", result.Version)
	return nil
}
