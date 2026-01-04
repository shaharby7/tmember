package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"tmember/internal/models"
	"tmember/internal/utils"
)

// AuthMiddleware validates JWT tokens and adds user context to requests
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get the Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			writeErrorResponse(w, http.StatusUnauthorized, "Authorization header required", "MISSING_AUTH_HEADER")
			return
		}

		// Check if the header starts with "Bearer "
		if !strings.HasPrefix(authHeader, "Bearer ") {
			writeErrorResponse(w, http.StatusUnauthorized, "Invalid authorization header format", "INVALID_AUTH_FORMAT")
			return
		}

		// Extract the token
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == "" {
			writeErrorResponse(w, http.StatusUnauthorized, "Token is required", "MISSING_TOKEN")
			return
		}

		// Validate the token
		claims, err := utils.ValidateJWT(tokenString)
		if err != nil {
			writeErrorResponse(w, http.StatusUnauthorized, "Invalid or expired token", "INVALID_TOKEN")
			return
		}

		// Add user information to the request context
		ctx := context.WithValue(r.Context(), "user_id", claims.UserID)
		ctx = context.WithValue(ctx, "user_email", claims.Email)

		// Call the next handler with the updated context
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// writeErrorResponse writes a JSON error response
func writeErrorResponse(w http.ResponseWriter, statusCode int, message, code string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	errorResponse := models.ErrorResponse{
		Error:   http.StatusText(statusCode),
		Message: message,
		Code:    code,
	}

	json.NewEncoder(w).Encode(errorResponse)
}

// GetUserIDFromContext extracts user ID from request context
func GetUserIDFromContext(ctx context.Context) (uint, bool) {
	userID, ok := ctx.Value("user_id").(uint)
	return userID, ok
}

// GetUserEmailFromContext extracts user email from request context
func GetUserEmailFromContext(ctx context.Context) (string, bool) {
	email, ok := ctx.Value("user_email").(string)
	return email, ok
}

// SetOrganizationContext adds organization information to the context
func SetOrganizationContext(ctx context.Context, orgID uint, role string) context.Context {
	ctx = context.WithValue(ctx, "organization_id", orgID)
	ctx = context.WithValue(ctx, "organization_role", role)
	return ctx
}

// GetOrganizationIDFromContext extracts organization ID from request context
func GetOrganizationIDFromContext(ctx context.Context) (uint, bool) {
	orgID, ok := ctx.Value("organization_id").(uint)
	return orgID, ok
}

// GetOrganizationRoleFromContext extracts organization role from request context
func GetOrganizationRoleFromContext(ctx context.Context) (string, bool) {
	role, ok := ctx.Value("organization_role").(string)
	return role, ok
}
