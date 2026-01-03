package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"tmember/pkg/api"
)

func main() {
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
	log.Printf("Echo API available at: http://localhost:%s/api/echo", port)

	if err := http.ListenAndServe(addr, server.Handler()); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
