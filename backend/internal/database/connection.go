package database

import (
	"fmt"
	"log"
	"time"

	"gorm.io/gorm"
)

// DB holds the database connection
var DB *gorm.DB

// Initialize sets up the database connection with retry logic
func Initialize() error {
	config := LoadConfig()

	var err error
	maxRetries := 5
	retryDelay := 2 * time.Second

	for i := 0; i < maxRetries; i++ {
		DB, err = Connect(config)
		if err == nil {
			log.Println("Database connection established successfully")
			return nil
		}

		log.Printf("Failed to connect to database (attempt %d/%d): %v", i+1, maxRetries, err)

		if i < maxRetries-1 {
			log.Printf("Retrying in %v...", retryDelay)
			time.Sleep(retryDelay)
			retryDelay *= 2 // Exponential backoff
		}
	}

	return fmt.Errorf("failed to connect to database after %d attempts: %w", maxRetries, err)
}

// GetDB returns the database connection
func GetDB() *gorm.DB {
	return DB
}

// Close closes the database connection
func Close() error {
	if DB == nil {
		return nil
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	if err := sqlDB.Close(); err != nil {
		return fmt.Errorf("failed to close database connection: %w", err)
	}

	log.Println("Database connection closed")
	return nil
}

// Ping checks if the database connection is alive
func Ping() error {
	if DB == nil {
		return fmt.Errorf("database connection is not initialized")
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	if err := sqlDB.Ping(); err != nil {
		return fmt.Errorf("database ping failed: %w", err)
	}

	return nil
}
