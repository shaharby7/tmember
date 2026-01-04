package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/quick"
	"time"

	"tmember/internal/models"
	"tmember/internal/utils"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupOrgTestDB creates an in-memory SQLite database for organization testing
func setupOrgTestDB() *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		panic("failed to connect to test database")
	}

	// Auto-migrate the schema
	// Note: SQLite doesn't support ENUM, so we'll use string type for Role
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

// createTestUser creates a test user and returns the user and JWT token
func createTestUser(db *gorm.DB) (models.User, string) {
	email := generateValidEmail(rand.New(rand.NewSource(time.Now().UnixNano())))
	password := generateValidPassword(rand.New(rand.NewSource(time.Now().UnixNano())))

	hashedPassword, _ := utils.HashPassword(password)
	user := models.User{
		Email:        email,
		PasswordHash: hashedPassword,
	}

	db.Create(&user)

	token, _ := utils.GenerateJWT(user.ID, user.Email)
	return user, token
}

// generateValidOrgName generates a valid organization name
func generateValidOrgName(r *rand.Rand) string {
	prefixes := []string{"Tech", "Data", "Cloud", "Digital", "Smart", "Global", "Future", "Next"}
	suffixes := []string{"Corp", "Inc", "LLC", "Solutions", "Systems", "Labs", "Works", "Group"}

	prefix := prefixes[r.Intn(len(prefixes))]
	suffix := suffixes[r.Intn(len(suffixes))]
	number := r.Intn(1000)

	return fmt.Sprintf("%s%d %s", prefix, number, suffix)
}

// TestOrganizationCreationAndAdminAssignment tests Property 10: Organization Creation and Admin Assignment
// **Feature: tmember-monorepo, Property 10: Organization Creation and Admin Assignment**
// **Validates: Requirements 12.2, 12.3, 14.3**
func TestOrganizationCreationAndAdminAssignment(t *testing.T) {
	property := func() bool {
		db := setupOrgTestDB()
		orgHandlers := NewOrganizationHandlers(db)

		// Create a test user
		user, _ := createTestUser(db)

		// Generate a valid organization name
		orgName := generateValidOrgName(rand.New(rand.NewSource(time.Now().UnixNano())))

		// Create organization request
		createReq := models.CreateOrganizationRequest{
			Name: orgName,
		}

		reqBody, _ := json.Marshal(createReq)
		req := httptest.NewRequest(http.MethodPost, "/api/organizations", bytes.NewBuffer(reqBody))

		// Add authentication context
		ctx := context.WithValue(req.Context(), "user_id", user.ID)
		ctx = context.WithValue(ctx, "user_email", user.Email)
		req = req.WithContext(ctx)

		w := httptest.NewRecorder()

		orgHandlers.CreateOrganizationHandler(w, req)

		// Organization creation should succeed
		if w.Code != http.StatusCreated {
			return false
		}

		// Parse response to get organization data
		var orgResponse models.OrganizationResponse
		if err := json.NewDecoder(w.Body).Decode(&orgResponse); err != nil {
			return false
		}

		// Verify organization was created with correct data
		var dbOrg models.Organization
		if err := db.Where("name = ?", orgName).First(&dbOrg).Error; err != nil {
			return false
		}

		// Organization should have a unique ID
		if dbOrg.ID == 0 {
			return false
		}

		// Organization name should match the request
		if dbOrg.Name != orgName {
			return false
		}

		// Response should contain the created organization data
		if orgResponse.ID != dbOrg.ID {
			return false
		}

		if orgResponse.Name != dbOrg.Name {
			return false
		}

		// User should be assigned as admin automatically
		if orgResponse.Role != string(models.RoleAdmin) {
			return false
		}

		// Verify admin membership was created in database
		var membership models.OrganizationMembership
		if err := db.Where("user_id = ? AND organization_id = ?", user.ID, dbOrg.ID).First(&membership).Error; err != nil {
			return false
		}

		// Membership should have admin role
		if membership.Role != models.RoleAdmin {
			return false
		}

		// Membership should link correct user and organization
		if membership.UserID != user.ID {
			return false
		}

		if membership.OrganizationID != dbOrg.ID {
			return false
		}

		// CreatedAt and UpdatedAt should be set for both organization and membership
		if dbOrg.CreatedAt.IsZero() || dbOrg.UpdatedAt.IsZero() {
			return false
		}

		if membership.CreatedAt.IsZero() || membership.UpdatedAt.IsZero() {
			return false
		}

		return true
	}

	config := &quick.Config{MaxCount: 100}
	if err := quick.Check(property, config); err != nil {
		t.Errorf("Property failed: %v", err)
	}
}

// TestOrganizationMembershipAndRoleManagement tests Property 11: Organization Membership and Role Management
// **Feature: tmember-monorepo, Property 11: Organization Membership and Role Management**
// **Validates: Requirements 13.6, 14.2**
func TestOrganizationMembershipAndRoleManagement(t *testing.T) {
	property := func() bool {
		db := setupOrgTestDB()

		// Create two test users
		user1, _ := createTestUser(db)
		user2, _ := createTestUser(db)

		// Create an organization
		orgName := generateValidOrgName(rand.New(rand.NewSource(time.Now().UnixNano())))
		org := models.Organization{Name: orgName}
		if err := db.Create(&org).Error; err != nil {
			return false
		}

		// Test 1: Create admin membership for user1
		adminMembership := models.OrganizationMembership{
			UserID:         user1.ID,
			OrganizationID: org.ID,
			Role:           models.RoleAdmin,
		}
		if err := db.Create(&adminMembership).Error; err != nil {
			return false
		}

		// Test 2: Create member membership for user2
		memberMembership := models.OrganizationMembership{
			UserID:         user2.ID,
			OrganizationID: org.ID,
			Role:           models.RoleMember,
		}
		if err := db.Create(&memberMembership).Error; err != nil {
			return false
		}

		// Test 3: Verify membership roles are correctly stored and retrieved
		var retrievedAdminMembership models.OrganizationMembership
		if err := db.Where("user_id = ? AND organization_id = ?", user1.ID, org.ID).First(&retrievedAdminMembership).Error; err != nil {
			return false
		}

		if retrievedAdminMembership.Role != models.RoleAdmin {
			return false
		}

		var retrievedMemberMembership models.OrganizationMembership
		if err := db.Where("user_id = ? AND organization_id = ?", user2.ID, org.ID).First(&retrievedMemberMembership).Error; err != nil {
			return false
		}

		if retrievedMemberMembership.Role != models.RoleMember {
			return false
		}

		// Test 4: Verify role can be updated
		retrievedMemberMembership.Role = models.RoleAdmin
		if err := db.Save(&retrievedMemberMembership).Error; err != nil {
			return false
		}

		var updatedMembership models.OrganizationMembership
		if err := db.Where("id = ?", retrievedMemberMembership.ID).First(&updatedMembership).Error; err != nil {
			return false
		}

		if updatedMembership.Role != models.RoleAdmin {
			return false
		}

		// Test 5: Verify foreign key relationships work correctly
		if retrievedAdminMembership.UserID != user1.ID {
			return false
		}

		if retrievedAdminMembership.OrganizationID != org.ID {
			return false
		}

		// Test 6: Verify timestamps are set correctly
		if retrievedAdminMembership.CreatedAt.IsZero() || retrievedAdminMembership.UpdatedAt.IsZero() {
			return false
		}

		// Test 7: Verify membership uniqueness (user can only have one membership per organization)
		var membershipCount int64
		db.Model(&models.OrganizationMembership{}).Where("user_id = ? AND organization_id = ?", user1.ID, org.ID).Count(&membershipCount)

		// User1 should have exactly one membership (the admin one we created)
		if membershipCount != 1 {
			return false
		}

		return true
	}

	config := &quick.Config{MaxCount: 100}
	if err := quick.Check(property, config); err != nil {
		t.Errorf("Property failed: %v", err)
	}
}

// TestOrganizationAccessControl tests Property 12: Organization Access Control
// **Feature: tmember-monorepo, Property 12: Organization Access Control**
// **Validates: Requirements 14.4**
func TestOrganizationAccessControl(t *testing.T) {
	property := func() bool {
		db := setupOrgTestDB()
		orgHandlers := NewOrganizationHandlers(db)

		// Create two test users
		user1, _ := createTestUser(db)
		user2, _ := createTestUser(db)

		// Create two organizations
		org1Name := generateValidOrgName(rand.New(rand.NewSource(time.Now().UnixNano())))
		org1 := models.Organization{Name: org1Name}
		db.Create(&org1)

		org2Name := generateValidOrgName(rand.New(rand.NewSource(time.Now().UnixNano())))
		org2 := models.Organization{Name: org2Name}
		db.Create(&org2)

		// User1 is member of org1 only
		membership1 := models.OrganizationMembership{
			UserID:         user1.ID,
			OrganizationID: org1.ID,
			Role:           models.RoleAdmin,
		}
		db.Create(&membership1)

		// User2 is member of org2 only
		membership2 := models.OrganizationMembership{
			UserID:         user2.ID,
			OrganizationID: org2.ID,
			Role:           models.RoleMember,
		}
		db.Create(&membership2)

		// Test 1: User1 should have access to org1
		req1 := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/organizations/%d/members", org1.ID), nil)
		ctx1 := context.WithValue(req1.Context(), "user_id", user1.ID)
		ctx1 = context.WithValue(ctx1, "user_email", user1.Email)
		req1 = req1.WithContext(ctx1)

		w1 := httptest.NewRecorder()

		// Apply organization access middleware
		middleware := orgHandlers.OrganizationAccessMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// If we reach here, access was granted
			w.WriteHeader(http.StatusOK)
		}))

		middleware.ServeHTTP(w1, req1)

		// User1 should have access to org1
		if w1.Code != http.StatusOK {
			return false
		}

		// Test 2: User1 should NOT have access to org2
		req2 := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/organizations/%d/members", org2.ID), nil)
		ctx2 := context.WithValue(req2.Context(), "user_id", user1.ID)
		ctx2 = context.WithValue(ctx2, "user_email", user1.Email)
		req2 = req2.WithContext(ctx2)

		w2 := httptest.NewRecorder()

		middleware.ServeHTTP(w2, req2)

		// User1 should be denied access to org2
		if w2.Code != http.StatusForbidden {
			return false
		}

		// Test 3: User2 should have access to org2
		req3 := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/organizations/%d/members", org2.ID), nil)
		ctx3 := context.WithValue(req3.Context(), "user_id", user2.ID)
		ctx3 = context.WithValue(ctx3, "user_email", user2.Email)
		req3 = req3.WithContext(ctx3)

		w3 := httptest.NewRecorder()

		middleware.ServeHTTP(w3, req3)

		// User2 should have access to org2
		if w3.Code != http.StatusOK {
			return false
		}

		// Test 4: User2 should NOT have access to org1
		req4 := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/organizations/%d/members", org1.ID), nil)
		ctx4 := context.WithValue(req4.Context(), "user_id", user2.ID)
		ctx4 = context.WithValue(ctx4, "user_email", user2.Email)
		req4 = req4.WithContext(ctx4)

		w4 := httptest.NewRecorder()

		middleware.ServeHTTP(w4, req4)

		// User2 should be denied access to org1
		if w4.Code != http.StatusForbidden {
			return false
		}

		// Test 5: Unauthenticated user should be denied access
		req5 := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/organizations/%d/members", org1.ID), nil)
		// No user context added

		w5 := httptest.NewRecorder()

		middleware.ServeHTTP(w5, req5)

		// Unauthenticated user should be denied
		if w5.Code != http.StatusUnauthorized {
			return false
		}

		// Test 6: Invalid organization ID should be handled gracefully
		req6 := httptest.NewRequest(http.MethodGet, "/api/organizations/99999/members", nil)
		ctx6 := context.WithValue(req6.Context(), "user_id", user1.ID)
		ctx6 = context.WithValue(ctx6, "user_email", user1.Email)
		req6 = req6.WithContext(ctx6)

		w6 := httptest.NewRecorder()

		middleware.ServeHTTP(w6, req6)

		// Non-existent organization should be forbidden
		if w6.Code != http.StatusForbidden {
			return false
		}

		return true
	}

	config := &quick.Config{MaxCount: 100}
	if err := quick.Check(property, config); err != nil {
		t.Errorf("Property failed: %v", err)
	}
}

// TestOrganizationListingAndSwitching tests Property 13: Organization Listing and Switching
// **Feature: tmember-monorepo, Property 13: Organization Listing and Switching**
// **Validates: Requirements 13.2, 13.3**
func TestOrganizationListingAndSwitching(t *testing.T) {
	property := func() bool {
		db := setupOrgTestDB()
		orgHandlers := NewOrganizationHandlers(db)

		// Create a test user
		user, _ := createTestUser(db)

		// Create multiple organizations
		org1Name := generateValidOrgName(rand.New(rand.NewSource(time.Now().UnixNano())))
		org1 := models.Organization{Name: org1Name}
		db.Create(&org1)

		org2Name := generateValidOrgName(rand.New(rand.NewSource(time.Now().UnixNano())))
		org2 := models.Organization{Name: org2Name}
		db.Create(&org2)

		org3Name := generateValidOrgName(rand.New(rand.NewSource(time.Now().UnixNano())))
		org3 := models.Organization{Name: org3Name}
		db.Create(&org3)

		// User is member of org1 and org2, but not org3
		membership1 := models.OrganizationMembership{
			UserID:         user.ID,
			OrganizationID: org1.ID,
			Role:           models.RoleAdmin,
		}
		db.Create(&membership1)

		membership2 := models.OrganizationMembership{
			UserID:         user.ID,
			OrganizationID: org2.ID,
			Role:           models.RoleMember,
		}
		db.Create(&membership2)

		// Test 1: List organizations should return only user's organizations
		req1 := httptest.NewRequest(http.MethodGet, "/api/organizations", nil)
		ctx1 := context.WithValue(req1.Context(), "user_id", user.ID)
		ctx1 = context.WithValue(ctx1, "user_email", user.Email)
		req1 = req1.WithContext(ctx1)

		w1 := httptest.NewRecorder()

		orgHandlers.ListOrganizationsHandler(w1, req1)

		// Should return success
		if w1.Code != http.StatusOK {
			return false
		}

		// Parse response
		var listResponse models.ListOrganizationsResponse
		if err := json.NewDecoder(w1.Body).Decode(&listResponse); err != nil {
			return false
		}

		// Should return exactly 2 organizations (org1 and org2)
		if len(listResponse.Organizations) != 2 {
			return false
		}

		// Verify organizations are the correct ones
		orgIDs := make(map[uint]bool)
		orgRoles := make(map[uint]string)
		for _, org := range listResponse.Organizations {
			orgIDs[org.ID] = true
			orgRoles[org.ID] = org.Role
		}

		// Should contain org1 and org2, but not org3
		if !orgIDs[org1.ID] || !orgIDs[org2.ID] || orgIDs[org3.ID] {
			return false
		}

		// Verify roles are correct
		if orgRoles[org1.ID] != string(models.RoleAdmin) {
			return false
		}

		if orgRoles[org2.ID] != string(models.RoleMember) {
			return false
		}

		// Test 2: Switch to org1 should succeed
		req2 := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/organizations/%d/switch", org1.ID), nil)
		ctx2 := context.WithValue(req2.Context(), "user_id", user.ID)
		ctx2 = context.WithValue(ctx2, "user_email", user.Email)
		req2 = req2.WithContext(ctx2)

		w2 := httptest.NewRecorder()

		orgHandlers.SwitchOrganizationHandler(w2, req2)

		// Should return success
		if w2.Code != http.StatusOK {
			return false
		}

		// Parse response
		var switchResponse models.SwitchOrganizationResponse
		if err := json.NewDecoder(w2.Body).Decode(&switchResponse); err != nil {
			return false
		}

		// Should return org1 details with admin role
		if switchResponse.Organization.ID != org1.ID {
			return false
		}

		if switchResponse.Organization.Name != org1Name {
			return false
		}

		if switchResponse.Organization.Role != string(models.RoleAdmin) {
			return false
		}

		// Test 3: Switch to org2 should succeed
		req3 := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/organizations/%d/switch", org2.ID), nil)
		ctx3 := context.WithValue(req3.Context(), "user_id", user.ID)
		ctx3 = context.WithValue(ctx3, "user_email", user.Email)
		req3 = req3.WithContext(ctx3)

		w3 := httptest.NewRecorder()

		orgHandlers.SwitchOrganizationHandler(w3, req3)

		// Should return success
		if w3.Code != http.StatusOK {
			return false
		}

		// Parse response
		var switchResponse2 models.SwitchOrganizationResponse
		if err := json.NewDecoder(w3.Body).Decode(&switchResponse2); err != nil {
			return false
		}

		// Should return org2 details with member role
		if switchResponse2.Organization.ID != org2.ID {
			return false
		}

		if switchResponse2.Organization.Name != org2Name {
			return false
		}

		if switchResponse2.Organization.Role != string(models.RoleMember) {
			return false
		}

		// Test 4: Switch to org3 should fail (user is not a member)
		req4 := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/organizations/%d/switch", org3.ID), nil)
		ctx4 := context.WithValue(req4.Context(), "user_id", user.ID)
		ctx4 = context.WithValue(ctx4, "user_email", user.Email)
		req4 = req4.WithContext(ctx4)

		w4 := httptest.NewRecorder()

		orgHandlers.SwitchOrganizationHandler(w4, req4)

		// Should return forbidden
		if w4.Code != http.StatusForbidden {
			return false
		}

		// Test 5: Switch to non-existent organization should fail
		req5 := httptest.NewRequest(http.MethodPost, "/api/organizations/99999/switch", nil)
		ctx5 := context.WithValue(req5.Context(), "user_id", user.ID)
		ctx5 = context.WithValue(ctx5, "user_email", user.Email)
		req5 = req5.WithContext(ctx5)

		w5 := httptest.NewRecorder()

		orgHandlers.SwitchOrganizationHandler(w5, req5)

		// Should return forbidden
		if w5.Code != http.StatusForbidden {
			return false
		}

		// Test 6: Unauthenticated user should not be able to list organizations
		req6 := httptest.NewRequest(http.MethodGet, "/api/organizations", nil)
		// No user context added

		w6 := httptest.NewRecorder()

		orgHandlers.ListOrganizationsHandler(w6, req6)

		// Should return unauthorized
		if w6.Code != http.StatusUnauthorized {
			return false
		}

		return true
	}

	config := &quick.Config{MaxCount: 100}
	if err := quick.Check(property, config); err != nil {
		t.Errorf("Property failed: %v", err)
	}
}

// TestAdminRoleManagementPermissions tests Property 14: Admin Role Management Permissions
// **Feature: tmember-monorepo, Property 14: Admin Role Management Permissions**
// **Validates: Requirements 14.5**
func TestAdminRoleManagementPermissions(t *testing.T) {
	property := func() bool {
		db := setupOrgTestDB()
		orgHandlers := NewOrganizationHandlers(db)

		// Create test users
		admin, _ := createTestUser(db)
		member, _ := createTestUser(db)

		// Create an organization
		orgName := generateValidOrgName(rand.New(rand.NewSource(time.Now().UnixNano())))
		org := models.Organization{Name: orgName}
		if err := db.Create(&org).Error; err != nil {
			return false
		}

		// Admin is admin of the organization
		adminMembership := models.OrganizationMembership{
			UserID:         admin.ID,
			OrganizationID: org.ID,
			Role:           models.RoleAdmin,
		}
		if err := db.Create(&adminMembership).Error; err != nil {
			return false
		}

		// Member is member of the organization
		memberMembership := models.OrganizationMembership{
			UserID:         member.ID,
			OrganizationID: org.ID,
			Role:           models.RoleMember,
		}
		if err := db.Create(&memberMembership).Error; err != nil {
			return false
		}

		// Test 1: Admin should be able to list organization members
		req1 := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/organizations/%d/members", org.ID), nil)
		ctx1 := context.WithValue(req1.Context(), "user_id", admin.ID)
		ctx1 = context.WithValue(ctx1, "user_email", admin.Email)
		req1 = req1.WithContext(ctx1)

		w1 := httptest.NewRecorder()

		// Apply organization access middleware first, then call the handler
		middleware := orgHandlers.OrganizationAccessMiddleware(http.HandlerFunc(orgHandlers.ListOrganizationMembersHandler))
		middleware.ServeHTTP(w1, req1)

		// Admin should have access
		if w1.Code != http.StatusOK {
			return false
		}

		// Test 2: Member should NOT be able to list organization members (admin only)
		req2 := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/organizations/%d/members", org.ID), nil)
		ctx2 := context.WithValue(req2.Context(), "user_id", member.ID)
		ctx2 = context.WithValue(ctx2, "user_email", member.Email)
		req2 = req2.WithContext(ctx2)

		w2 := httptest.NewRecorder()

		middleware.ServeHTTP(w2, req2)

		// Member should be denied (admin required)
		if w2.Code != http.StatusForbidden {
			return false
		}

		// Test 3: Admin should be able to update member roles
		updateReq := map[string]string{"role": "admin"}
		reqBody, _ := json.Marshal(updateReq)

		req3 := httptest.NewRequest(http.MethodPut, fmt.Sprintf("/api/organizations/%d/members/%d/role", org.ID, memberMembership.ID), bytes.NewBuffer(reqBody))
		ctx3 := context.WithValue(req3.Context(), "user_id", admin.ID)
		ctx3 = context.WithValue(ctx3, "user_email", admin.Email)
		req3 = req3.WithContext(ctx3)

		w3 := httptest.NewRecorder()

		// Apply organization access middleware first, then call the handler
		updateMiddleware := orgHandlers.OrganizationAccessMiddleware(http.HandlerFunc(orgHandlers.UpdateMemberRoleHandler))
		updateMiddleware.ServeHTTP(w3, req3)

		// Admin should be able to update roles
		if w3.Code != http.StatusOK {
			return false
		}

		// Verify the role was actually updated
		var updatedMembership models.OrganizationMembership
		if err := db.Where("id = ?", memberMembership.ID).First(&updatedMembership).Error; err != nil {
			return false
		}

		if updatedMembership.Role != models.RoleAdmin {
			return false
		}

		// Test 4: Verify database state is consistent
		var adminCount int64
		db.Model(&models.OrganizationMembership{}).Where("organization_id = ? AND role = ?", org.ID, models.RoleAdmin).Count(&adminCount)

		// Should have 2 admins now (original admin + promoted member)
		if adminCount != 2 {
			return false
		}

		// Test 5: Verify membership relationships are correct
		var allMemberships []models.OrganizationMembership
		if err := db.Where("organization_id = ?", org.ID).Find(&allMemberships).Error; err != nil {
			return false
		}

		// Should have exactly 2 memberships
		if len(allMemberships) != 2 {
			return false
		}

		// Verify both memberships are for the correct organization
		for _, membership := range allMemberships {
			if membership.OrganizationID != org.ID {
				return false
			}
			if membership.Role != models.RoleAdmin {
				return false
			}
		}

		return true
	}

	config := &quick.Config{MaxCount: 100}
	if err := quick.Check(property, config); err != nil {
		t.Errorf("Property failed: %v", err)
	}
}
