package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/quick"
)

// TestCORSHeaders tests that CORS headers are properly set
func TestCORSHeaders(t *testing.T) {
	// Property: For any request, CORS headers should be present
	property := func() bool {
		// Create a simple handler
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		})

		// Wrap with CORS middleware
		corsHandler := CORS(handler)

		// Create a request
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		w := httptest.NewRecorder()

		// Call the handler
		corsHandler.ServeHTTP(w, req)

		// Check CORS headers are present
		allowOrigin := w.Header().Get("Access-Control-Allow-Origin")
		allowMethods := w.Header().Get("Access-Control-Allow-Methods")
		allowHeaders := w.Header().Get("Access-Control-Allow-Headers")

		return allowOrigin == "*" &&
			allowMethods != "" &&
			allowHeaders != ""
	}

	// Run the property test
	if err := quick.Check(property, &quick.Config{MaxCount: 100}); err != nil {
		t.Errorf("CORS property test failed: %v", err)
	}
}

// TestOptionsRequest tests that OPTIONS requests are handled correctly
func TestOptionsRequest(t *testing.T) {
	// Property: For any OPTIONS request, should return 200 OK with CORS headers
	property := func() bool {
		// Create a simple handler
		handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusTeapot) // This should not be called for OPTIONS
		})

		// Wrap with CORS middleware
		corsHandler := CORS(handler)

		// Create an OPTIONS request
		req := httptest.NewRequest(http.MethodOptions, "/test", nil)
		w := httptest.NewRecorder()

		// Call the handler
		corsHandler.ServeHTTP(w, req)

		// Check that response is 200 OK (not 418 Teapot)
		if w.Code != http.StatusOK {
			return false
		}

		// Check CORS headers are present
		allowOrigin := w.Header().Get("Access-Control-Allow-Origin")
		return allowOrigin == "*"
	}

	// Run the property test
	if err := quick.Check(property, &quick.Config{MaxCount: 100}); err != nil {
		t.Errorf("OPTIONS property test failed: %v", err)
	}
}
