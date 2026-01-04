package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"tmember/internal/models"
	"tmember/internal/utils"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupTestDBForUnit creates an in-memory SQLite database for unit testing
func setupTestDBForUnit() *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		panic("failed to connect to test database")
	}

	// Auto-migrate the schema
	db.AutoMigrate(&models.User{}, &models.Organization{}, &models.OrganizationMembership{})

	return db
}

func TestRegisterHandler_ValidInput(t *testing.T) {
	db := setupTestDBForUnit()
	authHandlers := NewAuthHandlers(db)

	registerReq := models.RegisterRequest{
		Email:    "test@example.com",
		Password: "ValidPass123",
	}

	reqBody, _ := json.Marshal(registerReq)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(reqBody))
	w := httptest.NewRecorder()

	authHandlers.RegisterHandler(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("Expected status %d, got %d", http.StatusCreated, w.Code)
	}

	var response models.AuthResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if response.User.Email != registerReq.Email {
		t.Errorf("Expected email %s, got %s", registerReq.Email, response.User.Email)
	}

	if response.Token == "" {
		t.Error("Expected non-empty token")
	}
}

func TestRegisterHandler_InvalidEmail(t *testing.T) {
	db := setupTestDBForUnit()
	authHandlers := NewAuthHandlers(db)

	registerReq := models.RegisterRequest{
		Email:    "invalid-email",
		Password: "ValidPass123",
	}

	reqBody, _ := json.Marshal(registerReq)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(reqBody))
	w := httptest.NewRecorder()

	authHandlers.RegisterHandler(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestRegisterHandler_WeakPassword(t *testing.T) {
	db := setupTestDBForUnit()
	authHandlers := NewAuthHandlers(db)

	registerReq := models.RegisterRequest{
		Email:    "test@example.com",
		Password: "weak",
	}

	reqBody, _ := json.Marshal(registerReq)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(reqBody))
	w := httptest.NewRecorder()

	authHandlers.RegisterHandler(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestRegisterHandler_DuplicateEmail(t *testing.T) {
	db := setupTestDBForUnit()
	authHandlers := NewAuthHandlers(db)

	// First registration
	registerReq := models.RegisterRequest{
		Email:    "test@example.com",
		Password: "ValidPass123",
	}

	reqBody, _ := json.Marshal(registerReq)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(reqBody))
	w := httptest.NewRecorder()

	authHandlers.RegisterHandler(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("First registration failed with status %d", w.Code)
	}

	// Second registration with same email
	req2 := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(reqBody))
	w2 := httptest.NewRecorder()

	authHandlers.RegisterHandler(w2, req2)

	if w2.Code != http.StatusConflict {
		t.Errorf("Expected status %d, got %d", http.StatusConflict, w2.Code)
	}
}

func TestRegisterHandler_InvalidJSON(t *testing.T) {
	db := setupTestDBForUnit()
	authHandlers := NewAuthHandlers(db)

	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer([]byte("invalid json")))
	w := httptest.NewRecorder()

	authHandlers.RegisterHandler(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestRegisterHandler_WrongMethod(t *testing.T) {
	db := setupTestDBForUnit()
	authHandlers := NewAuthHandlers(db)

	req := httptest.NewRequest(http.MethodGet, "/api/auth/register", nil)
	w := httptest.NewRecorder()

	authHandlers.RegisterHandler(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("Expected status %d, got %d", http.StatusMethodNotAllowed, w.Code)
	}
}

func TestLoginHandler_ValidCredentials(t *testing.T) {
	db := setupTestDBForUnit()
	authHandlers := NewAuthHandlers(db)

	// First register a user
	email := "test@example.com"
	password := "ValidPass123"
	hashedPassword, _ := utils.HashPassword(password)

	user := models.User{
		Email:        email,
		PasswordHash: hashedPassword,
	}
	db.Create(&user)

	// Now try to login
	loginReq := models.LoginRequest{
		Email:    email,
		Password: password,
	}

	reqBody, _ := json.Marshal(loginReq)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(reqBody))
	w := httptest.NewRecorder()

	authHandlers.LoginHandler(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response models.AuthResponse
	if err := json.NewDecoder(w.Body).Decode(&response); err != nil {
		t.Fatalf("Failed to decode response: %v", err)
	}

	if response.User.Email != email {
		t.Errorf("Expected email %s, got %s", email, response.User.Email)
	}

	if response.Token == "" {
		t.Error("Expected non-empty token")
	}
}

func TestLoginHandler_InvalidCredentials(t *testing.T) {
	db := setupTestDBForUnit()
	authHandlers := NewAuthHandlers(db)

	// Register a user
	email := "test@example.com"
	password := "ValidPass123"
	hashedPassword, _ := utils.HashPassword(password)

	user := models.User{
		Email:        email,
		PasswordHash: hashedPassword,
	}
	db.Create(&user)

	// Try to login with wrong password
	loginReq := models.LoginRequest{
		Email:    email,
		Password: "WrongPassword123",
	}

	reqBody, _ := json.Marshal(loginReq)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(reqBody))
	w := httptest.NewRecorder()

	authHandlers.LoginHandler(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestLoginHandler_NonExistentUser(t *testing.T) {
	db := setupTestDBForUnit()
	authHandlers := NewAuthHandlers(db)

	loginReq := models.LoginRequest{
		Email:    "nonexistent@example.com",
		Password: "ValidPass123",
	}

	reqBody, _ := json.Marshal(loginReq)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(reqBody))
	w := httptest.NewRecorder()

	authHandlers.LoginHandler(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestLoginHandler_InvalidJSON(t *testing.T) {
	db := setupTestDBForUnit()
	authHandlers := NewAuthHandlers(db)

	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer([]byte("invalid json")))
	w := httptest.NewRecorder()

	authHandlers.LoginHandler(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestLoginHandler_WrongMethod(t *testing.T) {
	db := setupTestDBForUnit()
	authHandlers := NewAuthHandlers(db)

	req := httptest.NewRequest(http.MethodGet, "/api/auth/login", nil)
	w := httptest.NewRecorder()

	authHandlers.LoginHandler(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("Expected status %d, got %d", http.StatusMethodNotAllowed, w.Code)
	}
}

func TestJWTTokenGeneration(t *testing.T) {
	userID := uint(123)
	email := "test@example.com"

	token, err := utils.GenerateJWT(userID, email)
	if err != nil {
		t.Fatalf("Failed to generate JWT: %v", err)
	}

	if token == "" {
		t.Error("Expected non-empty token")
	}

	// Validate the token
	claims, err := utils.ValidateJWT(token)
	if err != nil {
		t.Fatalf("Failed to validate JWT: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("Expected user ID %d, got %d", userID, claims.UserID)
	}

	if claims.Email != email {
		t.Errorf("Expected email %s, got %s", email, claims.Email)
	}
}

func TestPasswordHashing(t *testing.T) {
	password := "TestPassword123"

	// Hash the password
	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	if hashedPassword == "" {
		t.Error("Expected non-empty hashed password")
	}

	if hashedPassword == password {
		t.Error("Hashed password should not equal original password")
	}

	// Verify the password
	if !utils.CheckPasswordHash(password, hashedPassword) {
		t.Error("Password verification failed")
	}

	// Verify wrong password fails
	if utils.CheckPasswordHash("WrongPassword", hashedPassword) {
		t.Error("Wrong password should not verify")
	}
}
