package api

import (
	"net/http"
	"strings"

	"tmember/internal/database"
	"tmember/internal/handlers"
	"tmember/internal/middleware"

	"gorm.io/gorm"
)

// Server represents the HTTP server configuration
type Server struct {
	mux *http.ServeMux
	db  *gorm.DB
}

// NewServer creates a new server instance with all routes configured
func NewServer() *Server {
	mux := http.NewServeMux()
	db := database.GetDB()

	// Create auth handlers with database connection
	authHandlers := handlers.NewAuthHandlers(db)
	orgHandlers := handlers.NewOrganizationHandlers(db)

	// Register routes
	mux.HandleFunc("/api/health", handlers.HealthHandler)

	// Authentication routes
	mux.HandleFunc("/api/auth/register", authHandlers.RegisterHandler)
	mux.HandleFunc("/api/auth/login", authHandlers.LoginHandler)

	// User routes (protected by auth middleware)
	mux.Handle("/api/users/me", middleware.AuthMiddleware(http.HandlerFunc(authHandlers.GetCurrentUserHandler)))

	// Organization routes (protected by auth middleware)
	mux.Handle("/api/organizations", middleware.AuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			orgHandlers.CreateOrganizationHandler(w, r)
		} else if r.Method == http.MethodGet {
			orgHandlers.ListOrganizationsHandler(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})))

	// Organization switch route (protected by auth middleware)
	mux.Handle("/api/organizations/", middleware.AuthMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/switch") {
			orgHandlers.SwitchOrganizationHandler(w, r)
		} else if strings.Contains(r.URL.Path, "/members") {
			// Apply organization access middleware for member management endpoints
			orgHandlers.OrganizationAccessMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if strings.HasSuffix(r.URL.Path, "/members") {
					// GET /api/organizations/{id}/members
					orgHandlers.ListOrganizationMembersHandler(w, r)
				} else if strings.HasSuffix(r.URL.Path, "/role") {
					// PUT /api/organizations/{id}/members/{membership_id}/role
					orgHandlers.UpdateMemberRoleHandler(w, r)
				} else if strings.Count(r.URL.Path, "/") == 5 {
					// DELETE /api/organizations/{id}/members/{membership_id}
					orgHandlers.RemoveMemberHandler(w, r)
				} else {
					http.Error(w, "Not found", http.StatusNotFound)
				}
			})).ServeHTTP(w, r)
		} else {
			http.Error(w, "Not found", http.StatusNotFound)
		}
	})))

	return &Server{mux: mux, db: db}
}

// Handler returns the HTTP handler with middleware applied
func (s *Server) Handler() http.Handler {
	return middleware.CORS(s.mux)
}
