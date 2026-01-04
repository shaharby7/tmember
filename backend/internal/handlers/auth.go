package handlers

import (
	"encoding/json"
	"net/http"

	"tmember/internal/models"
	"tmember/internal/utils"

	"gorm.io/gorm"
)

// AuthHandlers contains the database connection for authentication handlers
type AuthHandlers struct {
	DB *gorm.DB
}

// NewAuthHandlers creates a new AuthHandlers instance
func NewAuthHandlers(db *gorm.DB) *AuthHandlers {
	return &AuthHandlers{DB: db}
}

// RegisterHandler handles user registration
func (ah *AuthHandlers) RegisterHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed", "METHOD_NOT_ALLOWED")
		return
	}

	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErrorResponse(w, http.StatusBadRequest, "Invalid JSON payload", "INVALID_JSON")
		return
	}

	// Validate email format
	if !utils.ValidateEmail(req.Email) {
		writeErrorResponse(w, http.StatusBadRequest, "Invalid email format", "INVALID_EMAIL")
		return
	}

	// Validate password security criteria
	if err := utils.ValidatePassword(req.Password); err != nil {
		writeErrorResponse(w, http.StatusBadRequest, err.Error(), "WEAK_PASSWORD")
		return
	}

	// Check if user already exists
	var existingUser models.User
	if err := ah.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		writeErrorResponse(w, http.StatusConflict, "User with this email already exists", "EMAIL_EXISTS")
		return
	}

	// Hash the password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		writeErrorResponse(w, http.StatusInternalServerError, "Failed to process password", "PASSWORD_HASH_ERROR")
		return
	}

	// Create new user
	user := models.User{
		Email:        req.Email,
		PasswordHash: hashedPassword,
	}

	if err := ah.DB.Create(&user).Error; err != nil {
		writeErrorResponse(w, http.StatusInternalServerError, "Failed to create user", "USER_CREATION_ERROR")
		return
	}

	// Generate JWT token
	token, err := utils.GenerateJWT(user.ID, user.Email)
	if err != nil {
		writeErrorResponse(w, http.StatusInternalServerError, "Failed to generate token", "TOKEN_GENERATION_ERROR")
		return
	}

	// Return success response
	response := models.AuthResponse{
		User:  user,
		Token: token,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// LoginHandler handles user login
func (ah *AuthHandlers) LoginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed", "METHOD_NOT_ALLOWED")
		return
	}

	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErrorResponse(w, http.StatusBadRequest, "Invalid JSON payload", "INVALID_JSON")
		return
	}

	// Find user by email
	var user models.User
	if err := ah.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		writeErrorResponse(w, http.StatusUnauthorized, "Invalid email or password", "INVALID_CREDENTIALS")
		return
	}

	// Check password
	if !utils.CheckPasswordHash(req.Password, user.PasswordHash) {
		writeErrorResponse(w, http.StatusUnauthorized, "Invalid email or password", "INVALID_CREDENTIALS")
		return
	}

	// Generate JWT token
	token, err := utils.GenerateJWT(user.ID, user.Email)
	if err != nil {
		writeErrorResponse(w, http.StatusInternalServerError, "Failed to generate token", "TOKEN_GENERATION_ERROR")
		return
	}

	// Return success response
	response := models.AuthResponse{
		User:  user,
		Token: token,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
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
