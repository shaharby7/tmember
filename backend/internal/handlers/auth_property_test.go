package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/quick"
	"time"

	"tmember/internal/models"
	"tmember/internal/utils"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupTestDB creates an in-memory SQLite database for testing
func setupTestDB() *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		panic("failed to connect to test database")
	}

	// Auto-migrate the schema
	db.AutoMigrate(&models.User{}, &models.Organization{}, &models.OrganizationMembership{})

	return db
}

// generateValidEmail generates a valid email address
func generateValidEmail(r *rand.Rand) string {
	domains := []string{"example.com", "test.org", "demo.net", "sample.io"}
	prefixes := []string{"user", "test", "demo", "sample", "admin"}

	prefix := prefixes[r.Intn(len(prefixes))]
	domain := domains[r.Intn(len(domains))]
	number := r.Intn(10000)

	return fmt.Sprintf("%s%d@%s", prefix, number, domain)
}

// generateInvalidEmail generates an invalid email address
func generateInvalidEmail(r *rand.Rand) string {
	invalidEmails := []string{
		"invalid-email",
		"@example.com",
		"user@",
		"user.example.com",
		"user@.com",
		"user@com",
		"",
		"user name@example.com",
		"user@exam ple.com",
	}

	return invalidEmails[r.Intn(len(invalidEmails))]
}

// generateValidPassword generates a valid password
func generateValidPassword(r *rand.Rand) string {
	// Generate a password that meets all criteria
	passwords := []string{
		"Password123",
		"SecurePass1",
		"MySecret99",
		"TestPass1A",
		"ValidPwd123",
	}

	return passwords[r.Intn(len(passwords))]
}

// TestEmailValidationAndUniqueness tests Property 6: Email Validation and Uniqueness
// **Feature: tmember-monorepo, Property 6: Email Validation and Uniqueness**
// **Validates: Requirements 10.2, 11.2, 11.4, 11.5**
func TestEmailValidationAndUniqueness(t *testing.T) {
	property := func() bool {
		db := setupTestDB()
		authHandlers := NewAuthHandlers(db)

		// Test 1: Valid email should be accepted
		validEmail := generateValidEmail(rand.New(rand.NewSource(time.Now().UnixNano())))
		validPassword := generateValidPassword(rand.New(rand.NewSource(time.Now().UnixNano())))

		registerReq := models.RegisterRequest{
			Email:    validEmail,
			Password: validPassword,
		}

		reqBody, _ := json.Marshal(registerReq)
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(reqBody))
		w := httptest.NewRecorder()

		authHandlers.RegisterHandler(w, req)

		// First registration should succeed
		if w.Code != http.StatusCreated {
			return false
		}

		// Test 2: Duplicate email should be rejected
		w2 := httptest.NewRecorder()
		req2 := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(reqBody))

		authHandlers.RegisterHandler(w2, req2)

		// Second registration with same email should fail
		if w2.Code != http.StatusConflict {
			return false
		}

		// Test 3: Invalid email should be rejected
		invalidEmail := generateInvalidEmail(rand.New(rand.NewSource(time.Now().UnixNano())))
		invalidRegisterReq := models.RegisterRequest{
			Email:    invalidEmail,
			Password: validPassword,
		}

		invalidReqBody, _ := json.Marshal(invalidRegisterReq)
		req3 := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(invalidReqBody))
		w3 := httptest.NewRecorder()

		authHandlers.RegisterHandler(w3, req3)

		// Invalid email should be rejected
		if w3.Code != http.StatusBadRequest {
			return false
		}

		return true
	}

	config := &quick.Config{MaxCount: 100}
	if err := quick.Check(property, config); err != nil {
		t.Errorf("Property failed: %v", err)
	}
}

// generateWeakPassword generates a weak password that should be rejected
func generateWeakPassword(r *rand.Rand) string {
	weakPasswords := []string{
		"password",
		"12345678",
		"qwerty123",
		"short",
		"nouppercase123",
		"NOLOWERCASE123",
		"NoDigitsHere",
		"",
	}

	return weakPasswords[r.Intn(len(weakPasswords))]
}

// TestPasswordSecurityAndHashing tests Property 7: Password Security and Hashing
// **Feature: tmember-monorepo, Property 7: Password Security and Hashing**
// **Validates: Requirements 10.3, 10.4, 11.3**
func TestPasswordSecurityAndHashing(t *testing.T) {
	property := func() bool {
		db := setupTestDB()
		authHandlers := NewAuthHandlers(db)

		// Test 1: Valid password should be accepted and hashed
		validEmail := generateValidEmail(rand.New(rand.NewSource(time.Now().UnixNano())))
		validPassword := generateValidPassword(rand.New(rand.NewSource(time.Now().UnixNano())))

		registerReq := models.RegisterRequest{
			Email:    validEmail,
			Password: validPassword,
		}

		reqBody, _ := json.Marshal(registerReq)
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(reqBody))
		w := httptest.NewRecorder()

		authHandlers.RegisterHandler(w, req)

		// Registration should succeed
		if w.Code != http.StatusCreated {
			return false
		}

		// Verify password is hashed (not stored as plaintext)
		var user models.User
		if err := db.Where("email = ?", validEmail).First(&user).Error; err != nil {
			return false
		}

		// Password hash should not equal the original password
		if user.PasswordHash == validPassword {
			return false
		}

		// Password hash should be bcrypt format (starts with $2a$, $2b$, or $2y$)
		if !strings.HasPrefix(user.PasswordHash, "$2a$") &&
			!strings.HasPrefix(user.PasswordHash, "$2b$") &&
			!strings.HasPrefix(user.PasswordHash, "$2y$") {
			return false
		}

		// Test 2: Weak password should be rejected
		weakPassword := generateWeakPassword(rand.New(rand.NewSource(time.Now().UnixNano())))
		weakRegisterReq := models.RegisterRequest{
			Email:    generateValidEmail(rand.New(rand.NewSource(time.Now().UnixNano()))),
			Password: weakPassword,
		}

		weakReqBody, _ := json.Marshal(weakRegisterReq)
		req2 := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(weakReqBody))
		w2 := httptest.NewRecorder()

		authHandlers.RegisterHandler(w2, req2)

		// Weak password should be rejected
		if w2.Code != http.StatusBadRequest {
			return false
		}

		// Test 3: Login with correct password should work
		loginReq := models.LoginRequest{
			Email:    validEmail,
			Password: validPassword,
		}

		loginReqBody, _ := json.Marshal(loginReq)
		req3 := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(loginReqBody))
		w3 := httptest.NewRecorder()

		authHandlers.LoginHandler(w3, req3)

		// Login should succeed
		if w3.Code != http.StatusOK {
			return false
		}

		// Test 4: Login with wrong password should fail
		wrongLoginReq := models.LoginRequest{
			Email:    validEmail,
			Password: "WrongPassword123",
		}

		wrongLoginReqBody, _ := json.Marshal(wrongLoginReq)
		req4 := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(wrongLoginReqBody))
		w4 := httptest.NewRecorder()

		authHandlers.LoginHandler(w4, req4)

		// Login with wrong password should fail
		if w4.Code != http.StatusUnauthorized {
			return false
		}

		return true
	}

	config := &quick.Config{MaxCount: 100}
	if err := quick.Check(property, config); err != nil {
		t.Errorf("Property failed: %v", err)
	}
}

// TestUserRegistrationAndRecordCreation tests Property 8: User Registration and Record Creation
// **Feature: tmember-monorepo, Property 8: User Registration and Record Creation**
// **Validates: Requirements 10.5**
func TestUserRegistrationAndRecordCreation(t *testing.T) {
	property := func() bool {
		db := setupTestDB()
		authHandlers := NewAuthHandlers(db)

		// Generate valid registration data
		validEmail := generateValidEmail(rand.New(rand.NewSource(time.Now().UnixNano())))
		validPassword := generateValidPassword(rand.New(rand.NewSource(time.Now().UnixNano())))

		registerReq := models.RegisterRequest{
			Email:    validEmail,
			Password: validPassword,
		}

		reqBody, _ := json.Marshal(registerReq)
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(reqBody))
		w := httptest.NewRecorder()

		authHandlers.RegisterHandler(w, req)

		// Registration should succeed
		if w.Code != http.StatusCreated {
			return false
		}

		// Parse response to get user data
		var authResponse models.AuthResponse
		if err := json.NewDecoder(w.Body).Decode(&authResponse); err != nil {
			return false
		}

		// Verify user record was created with correct data
		var dbUser models.User
		if err := db.Where("email = ?", validEmail).First(&dbUser).Error; err != nil {
			return false
		}

		// User should have a unique ID
		if dbUser.ID == 0 {
			return false
		}

		// User email should match the registration email
		if dbUser.Email != validEmail {
			return false
		}

		// Password should be hashed (not plaintext)
		if dbUser.PasswordHash == validPassword {
			return false
		}

		// Password hash should not be empty
		if dbUser.PasswordHash == "" {
			return false
		}

		// Response should contain the created user data
		if authResponse.User.ID != dbUser.ID {
			return false
		}

		if authResponse.User.Email != dbUser.Email {
			return false
		}

		// Response should contain a valid JWT token
		if authResponse.Token == "" {
			return false
		}

		// Token should be valid and contain correct user information
		claims, err := utils.ValidateJWT(authResponse.Token)
		if err != nil {
			return false
		}

		if claims.UserID != dbUser.ID {
			return false
		}

		if claims.Email != dbUser.Email {
			return false
		}

		// CreatedAt and UpdatedAt should be set
		if dbUser.CreatedAt.IsZero() {
			return false
		}

		if dbUser.UpdatedAt.IsZero() {
			return false
		}

		return true
	}

	config := &quick.Config{MaxCount: 100}
	if err := quick.Check(property, config); err != nil {
		t.Errorf("Property failed: %v", err)
	}
}

// TestAuthenticationSessionManagement tests Property 9: Authentication Session Management
// **Feature: tmember-monorepo, Property 9: Authentication Session Management**
// **Validates: Requirements 10.6, 10.7**
func TestAuthenticationSessionManagement(t *testing.T) {
	property := func() bool {
		db := setupTestDB()
		authHandlers := NewAuthHandlers(db)

		// First, register a user
		validEmail := generateValidEmail(rand.New(rand.NewSource(time.Now().UnixNano())))
		validPassword := generateValidPassword(rand.New(rand.NewSource(time.Now().UnixNano())))

		registerReq := models.RegisterRequest{
			Email:    validEmail,
			Password: validPassword,
		}

		reqBody, _ := json.Marshal(registerReq)
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(reqBody))
		w := httptest.NewRecorder()

		authHandlers.RegisterHandler(w, req)

		// Registration should succeed
		if w.Code != http.StatusCreated {
			return false
		}

		// Test 1: Valid login credentials should create authenticated session
		loginReq := models.LoginRequest{
			Email:    validEmail,
			Password: validPassword,
		}

		loginReqBody, _ := json.Marshal(loginReq)
		req2 := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(loginReqBody))
		w2 := httptest.NewRecorder()

		authHandlers.LoginHandler(w2, req2)

		// Login should succeed
		if w2.Code != http.StatusOK {
			return false
		}

		// Parse login response to get token
		var loginResponse models.AuthResponse
		if err := json.NewDecoder(w2.Body).Decode(&loginResponse); err != nil {
			return false
		}

		// Token should be valid and contain correct user information
		claims, err := utils.ValidateJWT(loginResponse.Token)
		if err != nil {
			return false
		}

		if claims.Email != validEmail {
			return false
		}

		// Test 2: Invalid login credentials should reject session creation
		wrongLoginReq := models.LoginRequest{
			Email:    validEmail,
			Password: "WrongPassword123",
		}

		wrongLoginReqBody, _ := json.Marshal(wrongLoginReq)
		req3 := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(wrongLoginReqBody))
		w3 := httptest.NewRecorder()

		authHandlers.LoginHandler(w3, req3)

		// Login with wrong password should fail
		if w3.Code != http.StatusUnauthorized {
			return false
		}

		// Test 3: Login with non-existent email should fail
		nonExistentLoginReq := models.LoginRequest{
			Email:    generateValidEmail(rand.New(rand.NewSource(time.Now().UnixNano()))),
			Password: validPassword,
		}

		nonExistentReqBody, _ := json.Marshal(nonExistentLoginReq)
		req4 := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBuffer(nonExistentReqBody))
		w4 := httptest.NewRecorder()

		authHandlers.LoginHandler(w4, req4)

		// Login with non-existent email should fail
		if w4.Code != http.StatusUnauthorized {
			return false
		}

		// Test 4: Token should have reasonable expiration time
		if claims.ExpiresAt == nil {
			return false
		}

		// Token should expire in the future (within 24 hours)
		expirationTime := claims.ExpiresAt.Time
		now := time.Now()
		if expirationTime.Before(now) {
			return false
		}

		// Token should not expire too far in the future (more than 25 hours)
		maxExpiration := now.Add(25 * time.Hour)
		if expirationTime.After(maxExpiration) {
			return false
		}

		// Test 5: Token should be issued recently
		if claims.IssuedAt == nil {
			return false
		}

		issuedTime := claims.IssuedAt.Time
		// Token should be issued within the last minute
		minIssuedTime := now.Add(-1 * time.Minute)
		if issuedTime.Before(minIssuedTime) {
			return false
		}

		return true
	}

	config := &quick.Config{MaxCount: 100}
	if err := quick.Check(property, config); err != nil {
		t.Errorf("Property failed: %v", err)
	}
}
