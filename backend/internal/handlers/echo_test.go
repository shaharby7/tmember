package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/quick"

	"tmember/internal/models"
)

// TestEchoHandlerKnownResponses tests echo endpoint with specific known inputs and expected outputs
func TestEchoHandlerKnownResponses(t *testing.T) {
	testCases := []struct {
		name     string
		message  string
		expected string
	}{
		{"Simple message", "Hello, World!", "Hello, World!"},
		{"Message with numbers", "Test 123", "Test 123"},
		{"Message with special chars", "Hello @#$%^&*()", "Hello @#$%^&*()"},
		{"Unicode message", "Hello 世界", "Hello 世界"},
		{"Long message", strings.Repeat("A", 1000), strings.Repeat("A", 1000)},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			reqBody := models.EchoRequest{Message: tc.message}
			jsonBody, err := json.Marshal(reqBody)
			if err != nil {
				t.Fatalf("Failed to marshal request: %v", err)
			}

			req := httptest.NewRequest(http.MethodPost, "/api/echo", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			EchoHandler(w, req)

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
			var response models.EchoResponse
			if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
				t.Errorf("Failed to unmarshal response: %v", err)
			}

			if response.Echo != tc.expected {
				t.Errorf("Expected echo '%s', got '%s'", tc.expected, response.Echo)
			}
		})
	}
}

// TestEchoHandlerEmptyMessageScenarios tests specific empty message scenarios
func TestEchoHandlerEmptyMessageScenarios(t *testing.T) {
	testCases := []struct {
		name    string
		message string
	}{
		{"Empty string", ""},
		{"Only spaces", "   "},
		{"Only tabs", "\t\t"},
		{"Only newlines", "\n\n"},
		{"Mixed whitespace", " \t\n "},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			reqBody := models.EchoRequest{Message: tc.message}
			jsonBody, err := json.Marshal(reqBody)
			if err != nil {
				t.Fatalf("Failed to marshal request: %v", err)
			}

			req := httptest.NewRequest(http.MethodPost, "/api/echo", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			EchoHandler(w, req)

			// Check status code
			if w.Code != http.StatusBadRequest {
				t.Errorf("Expected status %d for empty message, got %d", http.StatusBadRequest, w.Code)
			}

			// Check error response
			var errorResponse models.ErrorResponse
			if err := json.Unmarshal(w.Body.Bytes(), &errorResponse); err != nil {
				t.Errorf("Failed to unmarshal error response: %v", err)
			}

			expectedError := "empty_message"
			if errorResponse.Error != expectedError {
				t.Errorf("Expected error '%s', got '%s'", expectedError, errorResponse.Error)
			}

			expectedMessage := "Message field cannot be empty"
			if errorResponse.Message != expectedMessage {
				t.Errorf("Expected message '%s', got '%s'", expectedMessage, errorResponse.Message)
			}
		})
	}
}

// TestEchoHandlerRoundTrip tests the echo round-trip property
func TestEchoHandlerRoundTrip(t *testing.T) {
	// Property: For any non-empty message, echo should return the same message
	property := func(message string) bool {
		// Skip empty messages as they should be rejected
		if strings.TrimSpace(message) == "" {
			return true
		}

		// Create request
		reqBody := models.EchoRequest{Message: message}
		jsonBody, _ := json.Marshal(reqBody)

		req := httptest.NewRequest(http.MethodPost, "/api/echo", bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		// Call the handler
		EchoHandler(w, req)

		// Check response
		if w.Code != http.StatusOK {
			return false
		}

		var response models.EchoResponse
		if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
			return false
		}

		return response.Echo == message
	}

	// Run the property test
	if err := quick.Check(property, &quick.Config{MaxCount: 100}); err != nil {
		t.Errorf("Echo round-trip property test failed: %v", err)
	}
}

// TestEchoHandlerEmptyMessage tests that empty messages are rejected
func TestEchoHandlerEmptyMessage(t *testing.T) {
	// Property: For any empty or whitespace-only message, should return error
	property := func() bool {
		emptyMessages := []string{"", "   ", "\t", "\n", "  \t\n  "}

		for _, message := range emptyMessages {
			reqBody := models.EchoRequest{Message: message}
			jsonBody, _ := json.Marshal(reqBody)

			req := httptest.NewRequest(http.MethodPost, "/api/echo", bytes.NewBuffer(jsonBody))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			EchoHandler(w, req)

			if w.Code != http.StatusBadRequest {
				return false
			}

			var errorResponse models.ErrorResponse
			if err := json.Unmarshal(w.Body.Bytes(), &errorResponse); err != nil {
				return false
			}

			if errorResponse.Error != "empty_message" {
				return false
			}
		}
		return true
	}

	// Run the property test
	if err := quick.Check(property, &quick.Config{MaxCount: 100}); err != nil {
		t.Errorf("Empty message property test failed: %v", err)
	}
}

// TestEchoHandlerInvalidJSON tests that invalid JSON is handled correctly
func TestEchoHandlerInvalidJSON(t *testing.T) {
	invalidJSONs := []string{
		"{invalid json}",
		"not json at all",
		"{\"message\": }",
		"",
	}

	for _, invalidJSON := range invalidJSONs {
		t.Run("InvalidJSON", func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/echo", strings.NewReader(invalidJSON))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()

			EchoHandler(w, req)

			if w.Code != http.StatusBadRequest {
				t.Errorf("Expected status %d for invalid JSON, got %d",
					http.StatusBadRequest, w.Code)
			}

			var errorResponse models.ErrorResponse
			if err := json.Unmarshal(w.Body.Bytes(), &errorResponse); err != nil {
				t.Errorf("Expected valid JSON error response, got: %s", w.Body.String())
			}

			if errorResponse.Error != "invalid_json" {
				t.Errorf("Expected error 'invalid_json', got '%s'", errorResponse.Error)
			}
		})
	}
}

// TestEchoHandlerInvalidMethods tests that invalid methods are handled correctly
func TestEchoHandlerInvalidMethods(t *testing.T) {
	invalidMethods := []string{http.MethodGet, http.MethodPut, http.MethodDelete, http.MethodPatch}

	for _, method := range invalidMethods {
		t.Run("Method_"+method, func(t *testing.T) {
			req := httptest.NewRequest(method, "/api/echo", nil)
			w := httptest.NewRecorder()

			EchoHandler(w, req)

			if w.Code != http.StatusMethodNotAllowed {
				t.Errorf("Expected status %d for method %s, got %d",
					http.StatusMethodNotAllowed, method, w.Code)
			}

			var errorResponse models.ErrorResponse
			if err := json.Unmarshal(w.Body.Bytes(), &errorResponse); err != nil {
				t.Errorf("Expected valid JSON error response, got: %s", w.Body.String())
			}

			if errorResponse.Error != "method_not_allowed" {
				t.Errorf("Expected error 'method_not_allowed', got '%s'", errorResponse.Error)
			}
		})
	}
}
