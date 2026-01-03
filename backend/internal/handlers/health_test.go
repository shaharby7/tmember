package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/quick"

	"tmember/internal/models"
)

// TestHealthHandlerJSONResponse tests that the health endpoint always returns valid JSON
func TestHealthHandlerJSONResponse(t *testing.T) {
	// Property: For any valid HTTP request to health endpoint, response should be valid JSON
	property := func() bool {
		// Create a request to the health endpoint
		req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
		w := httptest.NewRecorder()

		// Call the handler
		HealthHandler(w, req)

		// Check that response is 200 OK
		if w.Code != http.StatusOK {
			return false
		}

		// Check that Content-Type is application/json
		contentType := w.Header().Get("Content-Type")
		if contentType != "application/json" {
			return false
		}

		// Check that response body is valid JSON
		var response models.HealthResponse
		if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
			return false
		}

		// Check that response contains expected structure
		return response.Status != ""
	}

	// Run the property test
	if err := quick.Check(property, &quick.Config{MaxCount: 100}); err != nil {
		t.Errorf("Property test failed: %v", err)
	}
}

// TestHealthHandlerKnownResponse tests health endpoint with known expected response
func TestHealthHandlerKnownResponse(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	w := httptest.NewRecorder()

	HealthHandler(w, req)

	// Check status code
	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	// Check content type
	expectedContentType := "application/json"
	if contentType := w.Header().Get("Content-Type"); contentType != expectedContentType {
		t.Errorf("Expected Content-Type %s, got %s", expectedContentType, contentType)
	}

	// Check response body
	var response models.HealthResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Errorf("Failed to unmarshal response: %v", err)
	}

	expectedStatus := "ok"
	if response.Status != expectedStatus {
		t.Errorf("Expected status '%s', got '%s'", expectedStatus, response.Status)
	}
}

// TestHealthHandlerInvalidMethods tests that invalid methods are handled correctly
func TestHealthHandlerInvalidMethods(t *testing.T) {
	invalidMethods := []string{http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch}

	for _, method := range invalidMethods {
		t.Run("Method_"+method, func(t *testing.T) {
			req := httptest.NewRequest(method, "/api/health", nil)
			w := httptest.NewRecorder()

			HealthHandler(w, req)

			if w.Code != http.StatusMethodNotAllowed {
				t.Errorf("Expected status %d for method %s, got %d",
					http.StatusMethodNotAllowed, method, w.Code)
			}

			body := strings.TrimSpace(w.Body.String())
			if body != "Method not allowed" {
				t.Errorf("Expected 'Method not allowed', got '%s'", body)
			}
		})
	}
}
