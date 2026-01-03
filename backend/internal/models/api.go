package models

// HealthResponse represents the health check response
type HealthResponse struct {
	Status string `json:"status"`
}

// EchoRequest represents the echo API request
type EchoRequest struct {
	Message string `json:"message"`
}

// EchoResponse represents the echo API response
type EchoResponse struct {
	Echo string `json:"echo"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}
