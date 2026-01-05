package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"tmember/internal/database"
	"tmember/pkg/api"
)

func main() {
	// Initialize database connection
	log.Println("Initializing database connection...")
	if err := database.Initialize(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Run database migrations
	log.Println("Running database migrations...")
	if err := database.Migrate(); err != nil {
		log.Fatalf("Failed to run database migrations: %v", err)
	}

	// Test database connection
	if err := database.TestConnection(); err != nil {
		log.Fatalf("Database connection test failed: %v", err)
	}

	// Create a new server
	server := api.NewServer()

	// Get port from environment or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Start the server
	addr := fmt.Sprintf(":%s", port)
	log.Printf("Server starting on port %s", port)
	log.Printf("Health check available at: http://localhost:%s/api/health", port)
	log.Printf("Authentication endpoints:")
	log.Printf("  Register: http://localhost:%s/api/auth/register", port)
	log.Printf("  Login: http://localhost:%s/api/auth/login", port)

	if err := http.ListenAndServe(addr, server.Handler()); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
