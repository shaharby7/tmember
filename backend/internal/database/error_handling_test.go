package database

import (
	"fmt"
	"math/rand"
	"strings"
	"testing"
	"testing/quick"
	"time"
)

// TestDatabaseConnectionErrorHandling tests Property 5: Database Connection Error Handling
// Feature: tmember-monorepo, Property 5: For any database connection failure, the backend service should respond with appropriate error messages rather than crashing
func TestDatabaseConnectionErrorHandling(t *testing.T) {
	// Property test function
	property := func(invalidHost string, invalidPort string, invalidUser string, invalidPassword string) bool {
		// Generate invalid connection parameters
		if invalidHost == "" {
			invalidHost = fmt.Sprintf("nonexistent-host-%d", rand.Intn(10000))
		}
		if invalidPort == "" || invalidPort == "3306" {
			invalidPort = fmt.Sprintf("%d", 9999+rand.Intn(1000)) // Use high port numbers
		}
		if invalidUser == "" {
			invalidUser = fmt.Sprintf("invalid_user_%d", rand.Intn(1000))
		}
		if invalidPassword == "" {
			invalidPassword = fmt.Sprintf("invalid_pass_%d", rand.Intn(1000))
		}

		// Test invalid host
		config := &Config{
			Host:     invalidHost,
			Port:     "3306",
			User:     "tmember",
			Password: "password",
			DBName:   "tmember_dev",
		}

		_, err := Connect(config)
		if err == nil {
			t.Logf("Expected error for invalid host %s, but connection succeeded", invalidHost)
			return false
		}

		// Verify error message is descriptive and doesn't cause panic
		errorMsg := err.Error()
		if errorMsg == "" {
			t.Logf("Error message is empty for invalid host")
			return false
		}

		if !strings.Contains(errorMsg, "failed to connect to database") {
			t.Logf("Error message doesn't contain expected text: %s", errorMsg)
			return false
		}

		// Test invalid port
		config = &Config{
			Host:     "localhost",
			Port:     invalidPort,
			User:     "tmember",
			Password: "password",
			DBName:   "tmember_dev",
		}

		_, err = Connect(config)
		if err == nil {
			t.Logf("Expected error for invalid port %s, but connection succeeded", invalidPort)
			return false
		}

		// Verify error handling for invalid port
		errorMsg = err.Error()
		if errorMsg == "" {
			t.Logf("Error message is empty for invalid port")
			return false
		}

		// Test invalid credentials
		config = &Config{
			Host:     "localhost",
			Port:     "3306",
			User:     invalidUser,
			Password: invalidPassword,
			DBName:   "tmember_dev",
		}

		_, err = Connect(config)
		if err == nil {
			t.Logf("Expected error for invalid credentials, but connection succeeded")
			return false
		}

		// Verify error handling for invalid credentials
		errorMsg = err.Error()
		if errorMsg == "" {
			t.Logf("Error message is empty for invalid credentials")
			return false
		}

		return true
	}

	// Run property test with 5 iterations (reduced for connection tests)
	config := &quick.Config{
		MaxCount: 5,
		Rand:     rand.New(rand.NewSource(time.Now().UnixNano())),
	}

	if err := quick.Check(property, config); err != nil {
		t.Errorf("Database connection error handling property failed: %v", err)
	}
}

// TestPingErrorHandling tests that Ping function handles errors gracefully
func TestPingErrorHandling(t *testing.T) {
	// Test ping with nil DB
	originalDB := DB
	DB = nil

	err := Ping()
	if err == nil {
		t.Error("Expected Ping to fail with nil DB, but it succeeded")
	}

	if !strings.Contains(err.Error(), "database connection is not initialized") {
		t.Errorf("Ping error message doesn't match expected: %s", err.Error())
	}

	// Restore original DB
	DB = originalDB
}
