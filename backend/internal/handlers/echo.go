package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"tmember/internal/models"
)

// EchoHandler handles the echo API endpoint
func EchoHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		errorResponse := models.ErrorResponse{
			Error:   "method_not_allowed",
			Message: "Only POST method is allowed for this endpoint",
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(errorResponse)
		return
	}

	// Parse the request body
	var req models.EchoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		errorResponse := models.ErrorResponse{
			Error:   "invalid_json",
			Message: "Request body must be valid JSON",
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(errorResponse)
		return
	}

	// Validate that message is not empty (including whitespace-only)
	if strings.TrimSpace(req.Message) == "" {
		errorResponse := models.ErrorResponse{
			Error:   "empty_message",
			Message: "Message field cannot be empty",
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(errorResponse)
		return
	}

	// Create the echo response
	response := models.EchoResponse{Echo: req.Message}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding echo response: %v", err)
		errorResponse := models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to encode response",
		}
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(errorResponse)
		return
	}
}
