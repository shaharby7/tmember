package api

import (
	"net/http"

	"tmember/internal/handlers"
	"tmember/internal/middleware"
)

// Server represents the HTTP server configuration
type Server struct {
	mux *http.ServeMux
}

// NewServer creates a new server instance with all routes configured
func NewServer() *Server {
	mux := http.NewServeMux()

	// Register routes
	mux.HandleFunc("/api/health", handlers.HealthHandler)
	mux.HandleFunc("/api/echo", handlers.EchoHandler)

	return &Server{mux: mux}
}

// Handler returns the HTTP handler with middleware applied
func (s *Server) Handler() http.Handler {
	return middleware.CORS(s.mux)
}
