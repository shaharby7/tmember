package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"tmember/internal/database"
)

// HealthHandler handles the health check endpoint
func HealthHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Check database connectivity
	dbStatus := "ok"
	if err := database.Ping(); err != nil {
		log.Printf("Database health check failed: %v", err)
		dbStatus = "error"
	}

	response := struct {
		Status   string `json:"status"`
		Database string `json:"database"`
	}{
		Status:   "ok",
		Database: dbStatus,
	}

	// If database is down, return 503
	if dbStatus == "error" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusServiceUnavailable)
		response.Status = "error"
	} else {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
	}

	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding health response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}
