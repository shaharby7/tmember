package models

// RegisterRequest represents the request payload for user registration
type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

// LoginRequest represents the request payload for user login
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// AuthResponse represents the response payload for successful authentication
type AuthResponse struct {
	User  User   `json:"user"`
	Token string `json:"token"`
}
