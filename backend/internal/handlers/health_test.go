package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/quick"
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

		// Check that response is either 200 OK or 503 Service Unavailable (when DB is down)
		if w.Code != http.StatusOK && w.Code != http.StatusServiceUnavailable {
			return false
		}

		// Check that Content-Type is application/json
		contentType := w.Header().Get("Content-Type")
		if contentType != "application/json" {
			return false
		}

		// Check that response body is valid JSON with the actual response structure
		var response struct {
			Status   string `json:"status"`
			Database string `json:"database"`
		}
		if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
			return false
		}

		// Check that response contains expected structure
		return response.Status != "" && response.Database != ""
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

	// In test environment, database is not initialized, so we expect 503
	expectedStatusCode := http.StatusServiceUnavailable
	if w.Code != expectedStatusCode {
		t.Errorf("Expected status %d, got %d", expectedStatusCode, w.Code)
	}

	// Check content type
	expectedContentType := "application/json"
	if contentType := w.Header().Get("Content-Type"); contentType != expectedContentType {
		t.Errorf("Expected Content-Type %s, got %s", expectedContentType, contentType)
	}

	// Check response body with actual response structure
	var response struct {
		Status   string `json:"status"`
		Database string `json:"database"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Errorf("Failed to unmarshal response: %v", err)
	}

	// In test environment, expect error status due to database not being initialized
	expectedStatus := "error"
	if response.Status != expectedStatus {
		t.Errorf("Expected status '%s', got '%s'", expectedStatus, response.Status)
	}

	expectedDatabaseStatus := "error"
	if response.Database != expectedDatabaseStatus {
		t.Errorf("Expected database status '%s', got '%s'", expectedDatabaseStatus, response.Database)
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
