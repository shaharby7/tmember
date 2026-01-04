package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"tmember/internal/models"
	"tmember/internal/utils"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupOrgUnitTestDB creates an in-memory SQLite database for unit testing
func setupOrgUnitTestDB() *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		panic("failed to connect to test database")
	}

	// Auto-migrate the schema
	db.AutoMigrate(&models.User{}, &models.Organization{})

	// Create organization_memberships table manually for SQLite compatibility
	db.Exec(`CREATE TABLE organization_memberships (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		organization_id INTEGER NOT NULL,
		role TEXT NOT NULL,
		created_at DATETIME,
		updated_at DATETIME,
		deleted_at DATETIME,
		FOREIGN KEY (user_id) REFERENCES users(id),
		FOREIGN KEY (organization_id) REFERENCES organizations(id)
	)`)

	return db
}

// createUnitTestUser creates a test user for unit testing
func createUnitTestUser(db *gorm.DB, email string) models.User {
	hashedPassword, _ := utils.HashPassword("TestPassword123")
	user := models.User{
		Email:        email,
		PasswordHash: hashedPassword,
	}

	db.Create(&user)
	return user
}

// TestCreateOrganizationWithValidName tests organization creation with valid names
func TestCreateOrganizationWithValidName(t *testing.T) {
	db := setupOrgUnitTestDB()
	orgHandlers := NewOrganizationHandlers(db)

	// Create a test user
	user := createUnitTestUser(db, "test@example.com")

	// Test creating organization with valid name
	createReq := models.CreateOrganizationRequest{
		Name: "Test Organization",
	}

	reqBody, _ := json.Marshal(createReq)
	req := httptest.NewRequest(http.MethodPost, "/api/organizations", bytes.NewBuffer(reqBody))

	// Add authentication context
	ctx := context.WithValue(req.Context(), "user_id", user.ID)
	ctx = context.WithValue(ctx, "user_email", user.Email)
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()

	orgHandlers.CreateOrganizationHandler(w, req)

	// Should succeed
	if w.Code != http.StatusCreated {
		t.Errorf("Expected status %d, got %d", http.StatusCreated, w.Code)
	}

	// Parse response
	var orgResponse models.OrganizationResponse
	if err := json.NewDecoder(w.Body).Decode(&orgResponse); err != nil {
		t.Errorf("Failed to decode response: %v", err)
	}

	// Verify organization details
	if orgResponse.Name != "Test Organization" {
		t.Errorf("Expected name 'Test Organization', got '%s'", orgResponse.Name)
	}

	if orgResponse.Role != string(models.RoleAdmin) {
		t.Errorf("Expected role 'admin', got '%s'", orgResponse.Role)
	}

	// Verify organization was created in database
	var dbOrg models.Organization
	if err := db.Where("name = ?", "Test Organization").First(&dbOrg).Error; err != nil {
		t.Errorf("Organization not found in database: %v", err)
	}

	// Verify admin membership was created
	var membership models.OrganizationMembership
	if err := db.Where("user_id = ? AND organization_id = ?", user.ID, dbOrg.ID).First(&membership).Error; err != nil {
		t.Errorf("Admin membership not found: %v", err)
	}

	if membership.Role != models.RoleAdmin {
		t.Errorf("Expected admin role, got %s", membership.Role)
	}
}

// TestCreateOrganizationWithInvalidName tests organization creation with invalid names
func TestCreateOrganizationWithInvalidName(t *testing.T) {
	db := setupOrgUnitTestDB()
	orgHandlers := NewOrganizationHandlers(db)

	// Create a test user
	user := createUnitTestUser(db, "test@example.com")

	testCases := []struct {
		name         string
		orgName      string
		expectedCode int
	}{
		{"Empty name", "", http.StatusBadRequest},
		{"Whitespace only", "   ", http.StatusBadRequest},
		{"Tabs only", "\t\t", http.StatusBadRequest},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			createReq := models.CreateOrganizationRequest{
				Name: tc.orgName,
			}

			reqBody, _ := json.Marshal(createReq)
			req := httptest.NewRequest(http.MethodPost, "/api/organizations", bytes.NewBuffer(reqBody))

			// Add authentication context
			ctx := context.WithValue(req.Context(), "user_id", user.ID)
			ctx = context.WithValue(ctx, "user_email", user.Email)
			req = req.WithContext(ctx)

			w := httptest.NewRecorder()

			orgHandlers.CreateOrganizationHandler(w, req)

			// Should fail with bad request
			if w.Code != tc.expectedCode {
				t.Errorf("Expected status %d, got %d", tc.expectedCode, w.Code)
			}
		})
	}
}

// TestCreateOrganizationDuplicateName tests organization creation with duplicate names
func TestCreateOrganizationDuplicateName(t *testing.T) {
	db := setupOrgUnitTestDB()
	orgHandlers := NewOrganizationHandlers(db)

	// Create test users
	_ = createUnitTestUser(db, "user1@example.com")
	user2 := createUnitTestUser(db, "user2@example.com")

	// Create first organization
	org := models.Organization{Name: "Duplicate Org"}
	db.Create(&org)

	// Try to create organization with same name
	createReq := models.CreateOrganizationRequest{
		Name: "Duplicate Org",
	}

	reqBody, _ := json.Marshal(createReq)
	req := httptest.NewRequest(http.MethodPost, "/api/organizations", bytes.NewBuffer(reqBody))

	// Add authentication context
	ctx := context.WithValue(req.Context(), "user_id", user2.ID)
	ctx = context.WithValue(ctx, "user_email", user2.Email)
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()

	orgHandlers.CreateOrganizationHandler(w, req)

	// Should fail with conflict
	if w.Code != http.StatusConflict {
		t.Errorf("Expected status %d, got %d", http.StatusConflict, w.Code)
	}
}

// TestListOrganizationsForAuthenticatedUser tests organization listing for authenticated users
func TestListOrganizationsForAuthenticatedUser(t *testing.T) {
	db := setupOrgUnitTestDB()
	orgHandlers := NewOrganizationHandlers(db)

	// Create test user
	user := createUnitTestUser(db, "test@example.com")

	// Create organizations
	org1 := models.Organization{Name: "Org 1"}
	org2 := models.Organization{Name: "Org 2"}
	org3 := models.Organization{Name: "Org 3"}
	db.Create(&org1)
	db.Create(&org2)
	db.Create(&org3)

	// User is member of org1 and org2, but not org3
	membership1 := models.OrganizationMembership{
		UserID:         user.ID,
		OrganizationID: org1.ID,
		Role:           models.RoleAdmin,
	}
	membership2 := models.OrganizationMembership{
		UserID:         user.ID,
		OrganizationID: org2.ID,
		Role:           models.RoleMember,
	}
	db.Create(&membership1)
	db.Create(&membership2)

	// List organizations
	req := httptest.NewRequest(http.MethodGet, "/api/organizations", nil)
	ctx := context.WithValue(req.Context(), "user_id", user.ID)
	ctx = context.WithValue(ctx, "user_email", user.Email)
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()

	orgHandlers.ListOrganizationsHandler(w, req)

	// Should succeed
	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}

	// Parse response
	var listResponse models.ListOrganizationsResponse
	if err := json.NewDecoder(w.Body).Decode(&listResponse); err != nil {
		t.Errorf("Failed to decode response: %v", err)
	}

	// Should return exactly 2 organizations
	if len(listResponse.Organizations) != 2 {
		t.Errorf("Expected 2 organizations, got %d", len(listResponse.Organizations))
	}

	// Verify organizations and roles
	orgMap := make(map[string]string)
	for _, org := range listResponse.Organizations {
		orgMap[org.Name] = org.Role
	}

	if orgMap["Org 1"] != string(models.RoleAdmin) {
		t.Errorf("Expected admin role for Org 1, got %s", orgMap["Org 1"])
	}

	if orgMap["Org 2"] != string(models.RoleMember) {
		t.Errorf("Expected member role for Org 2, got %s", orgMap["Org 2"])
	}

	// Should not include Org 3
	if _, exists := orgMap["Org 3"]; exists {
		t.Error("Org 3 should not be included in user's organizations")
	}
}

// TestOrganizationSwitchingAndAccessControl tests organization switching and access control
func TestOrganizationSwitchingAndAccessControl(t *testing.T) {
	db := setupOrgUnitTestDB()
	orgHandlers := NewOrganizationHandlers(db)

	// Create test users
	user1 := createUnitTestUser(db, "user1@example.com")
	user2 := createUnitTestUser(db, "user2@example.com")

	// Create organizations
	org1 := models.Organization{Name: "User1 Org"}
	org2 := models.Organization{Name: "User2 Org"}
	db.Create(&org1)
	db.Create(&org2)

	// User1 is member of org1, User2 is member of org2
	membership1 := models.OrganizationMembership{
		UserID:         user1.ID,
		OrganizationID: org1.ID,
		Role:           models.RoleAdmin,
	}
	membership2 := models.OrganizationMembership{
		UserID:         user2.ID,
		OrganizationID: org2.ID,
		Role:           models.RoleMember,
	}
	db.Create(&membership1)
	db.Create(&membership2)

	// Test 1: User1 can switch to org1
	req1 := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/organizations/%d/switch", org1.ID), nil)
	ctx1 := context.WithValue(req1.Context(), "user_id", user1.ID)
	ctx1 = context.WithValue(ctx1, "user_email", user1.Email)
	req1 = req1.WithContext(ctx1)

	w1 := httptest.NewRecorder()

	orgHandlers.SwitchOrganizationHandler(w1, req1)

	// Should succeed
	if w1.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w1.Code)
	}

	// Test 2: User1 cannot switch to org2 (not a member)
	req2 := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/organizations/%d/switch", org2.ID), nil)
	ctx2 := context.WithValue(req2.Context(), "user_id", user1.ID)
	ctx2 = context.WithValue(ctx2, "user_email", user1.Email)
	req2 = req2.WithContext(ctx2)

	w2 := httptest.NewRecorder()

	orgHandlers.SwitchOrganizationHandler(w2, req2)

	// Should be forbidden
	if w2.Code != http.StatusForbidden {
		t.Errorf("Expected status %d, got %d", http.StatusForbidden, w2.Code)
	}

	// Test 3: User2 can switch to org2
	req3 := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/organizations/%d/switch", org2.ID), nil)
	ctx3 := context.WithValue(req3.Context(), "user_id", user2.ID)
	ctx3 = context.WithValue(ctx3, "user_email", user2.Email)
	req3 = req3.WithContext(ctx3)

	w3 := httptest.NewRecorder()

	orgHandlers.SwitchOrganizationHandler(w3, req3)

	// Should succeed
	if w3.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w3.Code)
	}

	// Parse response to verify details
	var switchResponse models.SwitchOrganizationResponse
	if err := json.NewDecoder(w3.Body).Decode(&switchResponse); err != nil {
		t.Errorf("Failed to decode response: %v", err)
	}

	if switchResponse.Organization.Name != "User2 Org" {
		t.Errorf("Expected org name 'User2 Org', got '%s'", switchResponse.Organization.Name)
	}

	if switchResponse.Organization.Role != string(models.RoleMember) {
		t.Errorf("Expected role 'member', got '%s'", switchResponse.Organization.Role)
	}
}

// TestMemberRoleManagementByAdmins tests member role management by organization admins
func TestMemberRoleManagementByAdmins(t *testing.T) {
	db := setupOrgUnitTestDB()
	orgHandlers := NewOrganizationHandlers(db)

	// Create test users
	admin := createUnitTestUser(db, "admin@example.com")
	member := createUnitTestUser(db, "member@example.com")

	// Create organization
	org := models.Organization{Name: "Test Org"}
	db.Create(&org)

	// Admin is admin, member is member
	adminMembership := models.OrganizationMembership{
		UserID:         admin.ID,
		OrganizationID: org.ID,
		Role:           models.RoleAdmin,
	}
	memberMembership := models.OrganizationMembership{
		UserID:         member.ID,
		OrganizationID: org.ID,
		Role:           models.RoleMember,
	}
	db.Create(&adminMembership)
	db.Create(&memberMembership)

	// Test 1: Admin can list organization members
	req1 := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/organizations/%d/members", org.ID), nil)
	ctx1 := context.WithValue(req1.Context(), "user_id", admin.ID)
	ctx1 = context.WithValue(ctx1, "user_email", admin.Email)
	req1 = req1.WithContext(ctx1)

	w1 := httptest.NewRecorder()

	// Apply organization access middleware
	middleware := orgHandlers.OrganizationAccessMiddleware(http.HandlerFunc(orgHandlers.ListOrganizationMembersHandler))
	middleware.ServeHTTP(w1, req1)

	// Should succeed
	if w1.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w1.Code)
	}

	// Test 2: Member cannot list organization members (admin only)
	req2 := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/organizations/%d/members", org.ID), nil)
	ctx2 := context.WithValue(req2.Context(), "user_id", member.ID)
	ctx2 = context.WithValue(ctx2, "user_email", member.Email)
	req2 = req2.WithContext(ctx2)

	w2 := httptest.NewRecorder()

	middleware.ServeHTTP(w2, req2)

	// Should be forbidden
	if w2.Code != http.StatusForbidden {
		t.Errorf("Expected status %d, got %d", http.StatusForbidden, w2.Code)
	}

	// Test 3: Admin can update member roles
	updateReq := map[string]string{"role": "admin"}
	reqBody, _ := json.Marshal(updateReq)

	req3 := httptest.NewRequest(http.MethodPut, fmt.Sprintf("/api/organizations/%d/members/%d/role", org.ID, memberMembership.ID), bytes.NewBuffer(reqBody))
	ctx3 := context.WithValue(req3.Context(), "user_id", admin.ID)
	ctx3 = context.WithValue(ctx3, "user_email", admin.Email)
	req3 = req3.WithContext(ctx3)

	w3 := httptest.NewRecorder()

	updateMiddleware := orgHandlers.OrganizationAccessMiddleware(http.HandlerFunc(orgHandlers.UpdateMemberRoleHandler))
	updateMiddleware.ServeHTTP(w3, req3)

	// Should succeed
	if w3.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w3.Code)
	}

	// Verify role was updated
	var updatedMembership models.OrganizationMembership
	if err := db.Where("id = ?", memberMembership.ID).First(&updatedMembership).Error; err != nil {
		t.Errorf("Failed to find updated membership: %v", err)
	}

	if updatedMembership.Role != models.RoleAdmin {
		t.Errorf("Expected role to be updated to admin, got %s", updatedMembership.Role)
	}
}
