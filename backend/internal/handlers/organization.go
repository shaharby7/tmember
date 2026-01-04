package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"tmember/internal/middleware"
	"tmember/internal/models"

	"gorm.io/gorm"
)

// OrganizationHandlers contains the database connection for organization handlers
type OrganizationHandlers struct {
	DB *gorm.DB
}

// NewOrganizationHandlers creates a new OrganizationHandlers instance
func NewOrganizationHandlers(db *gorm.DB) *OrganizationHandlers {
	return &OrganizationHandlers{DB: db}
}

// CreateOrganizationHandler handles organization creation
func (oh *OrganizationHandlers) CreateOrganizationHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed", "METHOD_NOT_ALLOWED")
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		writeErrorResponse(w, http.StatusUnauthorized, "User not authenticated", "NOT_AUTHENTICATED")
		return
	}

	var req models.CreateOrganizationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErrorResponse(w, http.StatusBadRequest, "Invalid JSON payload", "INVALID_JSON")
		return
	}

	// Validate organization name
	if strings.TrimSpace(req.Name) == "" {
		writeErrorResponse(w, http.StatusBadRequest, "Organization name is required", "INVALID_NAME")
		return
	}

	// Check if organization name already exists
	var existingOrg models.Organization
	if err := oh.DB.Where("name = ?", req.Name).First(&existingOrg).Error; err == nil {
		writeErrorResponse(w, http.StatusConflict, "Organization name already exists", "NAME_EXISTS")
		return
	}

	// Start a transaction for creating organization and membership
	tx := oh.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Create new organization
	org := models.Organization{
		Name: req.Name,
	}

	if err := tx.Create(&org).Error; err != nil {
		tx.Rollback()
		writeErrorResponse(w, http.StatusInternalServerError, "Failed to create organization", "CREATION_ERROR")
		return
	}

	// Create admin membership for the creator
	membership := models.OrganizationMembership{
		UserID:         userID,
		OrganizationID: org.ID,
		Role:           models.RoleAdmin,
	}

	if err := tx.Create(&membership).Error; err != nil {
		tx.Rollback()
		writeErrorResponse(w, http.StatusInternalServerError, "Failed to create organization membership", "MEMBERSHIP_ERROR")
		return
	}

	// Commit the transaction
	if err := tx.Commit().Error; err != nil {
		writeErrorResponse(w, http.StatusInternalServerError, "Failed to complete organization creation", "COMMIT_ERROR")
		return
	}

	// Return success response
	response := models.OrganizationResponse{
		ID:             org.ID,
		Name:           org.Name,
		BillingDetails: org.BillingDetails,
		CreatedAt:      org.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		UpdatedAt:      org.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		Role:           string(models.RoleAdmin),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// ListOrganizationsHandler handles listing user's organizations
func (oh *OrganizationHandlers) ListOrganizationsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed", "METHOD_NOT_ALLOWED")
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		writeErrorResponse(w, http.StatusUnauthorized, "User not authenticated", "NOT_AUTHENTICATED")
		return
	}

	// Get user's organization memberships with organization details
	var memberships []models.OrganizationMembership
	if err := oh.DB.Preload("Organization").Where("user_id = ?", userID).Find(&memberships).Error; err != nil {
		writeErrorResponse(w, http.StatusInternalServerError, "Failed to fetch organizations", "FETCH_ERROR")
		return
	}

	// Convert to response format
	organizations := make([]models.OrganizationResponse, len(memberships))
	for i, membership := range memberships {
		organizations[i] = models.OrganizationResponse{
			ID:             membership.Organization.ID,
			Name:           membership.Organization.Name,
			BillingDetails: membership.Organization.BillingDetails,
			CreatedAt:      membership.Organization.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:      membership.Organization.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
			Role:           string(membership.Role),
		}
	}

	response := models.ListOrganizationsResponse{
		Organizations: organizations,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// SwitchOrganizationHandler handles switching to a different organization
func (oh *OrganizationHandlers) SwitchOrganizationHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed", "METHOD_NOT_ALLOWED")
		return
	}

	// Get user ID from context (set by auth middleware)
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		writeErrorResponse(w, http.StatusUnauthorized, "User not authenticated", "NOT_AUTHENTICATED")
		return
	}

	// Extract organization ID from URL path
	path := r.URL.Path
	parts := strings.Split(path, "/")
	if len(parts) < 4 {
		writeErrorResponse(w, http.StatusBadRequest, "Invalid organization ID", "INVALID_ORG_ID")
		return
	}

	orgIDStr := parts[3] // /api/organizations/{id}/switch
	orgID, err := strconv.ParseUint(orgIDStr, 10, 32)
	if err != nil {
		writeErrorResponse(w, http.StatusBadRequest, "Invalid organization ID format", "INVALID_ORG_ID_FORMAT")
		return
	}

	// Check if user has access to this organization
	var membership models.OrganizationMembership
	if err := oh.DB.Preload("Organization").Where("user_id = ? AND organization_id = ?", userID, uint(orgID)).First(&membership).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			writeErrorResponse(w, http.StatusForbidden, "You don't have access to this organization", "ACCESS_DENIED")
		} else {
			writeErrorResponse(w, http.StatusInternalServerError, "Failed to verify organization access", "ACCESS_CHECK_ERROR")
		}
		return
	}

	// Return organization details
	response := models.SwitchOrganizationResponse{
		Organization: models.OrganizationResponse{
			ID:             membership.Organization.ID,
			Name:           membership.Organization.Name,
			BillingDetails: membership.Organization.BillingDetails,
			CreatedAt:      membership.Organization.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			UpdatedAt:      membership.Organization.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
			Role:           string(membership.Role),
		},
		Message: "Successfully switched to organization",
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// OrganizationAccessMiddleware validates that the user has access to the specified organization
func (oh *OrganizationHandlers) OrganizationAccessMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get user ID from context (set by auth middleware)
		userID, ok := middleware.GetUserIDFromContext(r.Context())
		if !ok {
			writeErrorResponse(w, http.StatusUnauthorized, "User not authenticated", "NOT_AUTHENTICATED")
			return
		}

		// Extract organization ID from URL path or query parameter
		var orgID uint

		// Try to get from URL path first (e.g., /api/organizations/{id}/...)
		path := r.URL.Path
		parts := strings.Split(path, "/")
		if len(parts) >= 4 && parts[2] == "organizations" {
			if id, err := strconv.ParseUint(parts[3], 10, 32); err == nil {
				orgID = uint(id)
			}
		}

		// If not found in path, try query parameter
		if orgID == 0 {
			if orgIDStr := r.URL.Query().Get("organization_id"); orgIDStr != "" {
				if id, err := strconv.ParseUint(orgIDStr, 10, 32); err == nil {
					orgID = uint(id)
				}
			}
		}

		// If still no organization ID found, skip middleware (for endpoints that don't require it)
		if orgID == 0 {
			next.ServeHTTP(w, r)
			return
		}

		// Check if user has access to this organization
		var membership models.OrganizationMembership
		if err := oh.DB.Where("user_id = ? AND organization_id = ?", userID, orgID).First(&membership).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				writeErrorResponse(w, http.StatusForbidden, "You don't have access to this organization", "ACCESS_DENIED")
			} else {
				writeErrorResponse(w, http.StatusInternalServerError, "Failed to verify organization access", "ACCESS_CHECK_ERROR")
			}
			return
		}

		// Add organization info to context
		ctx := r.Context()
		ctx = middleware.SetOrganizationContext(ctx, orgID, string(membership.Role))

		// Call the next handler with the updated context
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// ListOrganizationMembersHandler handles listing organization members (admin only)
func (oh *OrganizationHandlers) ListOrganizationMembersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed", "METHOD_NOT_ALLOWED")
		return
	}

	// Get organization ID and role from context
	orgID, ok := middleware.GetOrganizationIDFromContext(r.Context())
	if !ok {
		writeErrorResponse(w, http.StatusBadRequest, "Organization ID not found", "MISSING_ORG_ID")
		return
	}

	role, ok := middleware.GetOrganizationRoleFromContext(r.Context())
	if !ok || role != string(models.RoleAdmin) {
		writeErrorResponse(w, http.StatusForbidden, "Admin access required", "ADMIN_REQUIRED")
		return
	}

	// Get all memberships for this organization
	var memberships []models.OrganizationMembership
	if err := oh.DB.Preload("User").Where("organization_id = ?", orgID).Find(&memberships).Error; err != nil {
		writeErrorResponse(w, http.StatusInternalServerError, "Failed to fetch organization members", "FETCH_ERROR")
		return
	}

	// Convert to response format
	type MemberResponse struct {
		ID     uint   `json:"id"`
		UserID uint   `json:"user_id"`
		Email  string `json:"email"`
		Role   string `json:"role"`
	}

	members := make([]MemberResponse, len(memberships))
	for i, membership := range memberships {
		members[i] = MemberResponse{
			ID:     membership.ID,
			UserID: membership.UserID,
			Email:  membership.User.Email,
			Role:   string(membership.Role),
		}
	}

	response := map[string]interface{}{
		"members": members,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// UpdateMemberRoleHandler handles updating a member's role (admin only)
func (oh *OrganizationHandlers) UpdateMemberRoleHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		writeErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed", "METHOD_NOT_ALLOWED")
		return
	}

	// Get organization ID and role from context
	orgID, ok := middleware.GetOrganizationIDFromContext(r.Context())
	if !ok {
		writeErrorResponse(w, http.StatusBadRequest, "Organization ID not found", "MISSING_ORG_ID")
		return
	}

	role, ok := middleware.GetOrganizationRoleFromContext(r.Context())
	if !ok || role != string(models.RoleAdmin) {
		writeErrorResponse(w, http.StatusForbidden, "Admin access required", "ADMIN_REQUIRED")
		return
	}

	// Extract membership ID from URL path
	path := r.URL.Path
	parts := strings.Split(path, "/")
	if len(parts) < 6 {
		writeErrorResponse(w, http.StatusBadRequest, "Invalid membership ID", "INVALID_MEMBERSHIP_ID")
		return
	}

	membershipIDStr := parts[5] // /api/organizations/{id}/members/{membership_id}/role
	membershipID, err := strconv.ParseUint(membershipIDStr, 10, 32)
	if err != nil {
		writeErrorResponse(w, http.StatusBadRequest, "Invalid membership ID format", "INVALID_MEMBERSHIP_ID_FORMAT")
		return
	}

	// Parse request body
	var req struct {
		Role string `json:"role" binding:"required,oneof=admin member"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErrorResponse(w, http.StatusBadRequest, "Invalid JSON payload", "INVALID_JSON")
		return
	}

	// Validate role
	if req.Role != string(models.RoleAdmin) && req.Role != string(models.RoleMember) {
		writeErrorResponse(w, http.StatusBadRequest, "Invalid role. Must be 'admin' or 'member'", "INVALID_ROLE")
		return
	}

	// Find the membership
	var membership models.OrganizationMembership
	if err := oh.DB.Where("id = ? AND organization_id = ?", uint(membershipID), orgID).First(&membership).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			writeErrorResponse(w, http.StatusNotFound, "Membership not found", "MEMBERSHIP_NOT_FOUND")
		} else {
			writeErrorResponse(w, http.StatusInternalServerError, "Failed to find membership", "MEMBERSHIP_FETCH_ERROR")
		}
		return
	}

	// Update the role
	membership.Role = models.Role(req.Role)
	if err := oh.DB.Save(&membership).Error; err != nil {
		writeErrorResponse(w, http.StatusInternalServerError, "Failed to update member role", "UPDATE_ERROR")
		return
	}

	// Return success response
	response := map[string]interface{}{
		"message":       "Member role updated successfully",
		"membership_id": membership.ID,
		"new_role":      string(membership.Role),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

// RemoveMemberHandler handles removing a member from organization (admin only)
func (oh *OrganizationHandlers) RemoveMemberHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		writeErrorResponse(w, http.StatusMethodNotAllowed, "Method not allowed", "METHOD_NOT_ALLOWED")
		return
	}

	// Get organization ID and role from context
	orgID, ok := middleware.GetOrganizationIDFromContext(r.Context())
	if !ok {
		writeErrorResponse(w, http.StatusBadRequest, "Organization ID not found", "MISSING_ORG_ID")
		return
	}

	role, ok := middleware.GetOrganizationRoleFromContext(r.Context())
	if !ok || role != string(models.RoleAdmin) {
		writeErrorResponse(w, http.StatusForbidden, "Admin access required", "ADMIN_REQUIRED")
		return
	}

	// Extract membership ID from URL path
	path := r.URL.Path
	parts := strings.Split(path, "/")
	if len(parts) < 6 {
		writeErrorResponse(w, http.StatusBadRequest, "Invalid membership ID", "INVALID_MEMBERSHIP_ID")
		return
	}

	membershipIDStr := parts[5] // /api/organizations/{id}/members/{membership_id}
	membershipID, err := strconv.ParseUint(membershipIDStr, 10, 32)
	if err != nil {
		writeErrorResponse(w, http.StatusBadRequest, "Invalid membership ID format", "INVALID_MEMBERSHIP_ID_FORMAT")
		return
	}

	// Find the membership
	var membership models.OrganizationMembership
	if err := oh.DB.Where("id = ? AND organization_id = ?", uint(membershipID), orgID).First(&membership).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			writeErrorResponse(w, http.StatusNotFound, "Membership not found", "MEMBERSHIP_NOT_FOUND")
		} else {
			writeErrorResponse(w, http.StatusInternalServerError, "Failed to find membership", "MEMBERSHIP_FETCH_ERROR")
		}
		return
	}

	// Prevent removing the last admin
	var adminCount int64
	if err := oh.DB.Model(&models.OrganizationMembership{}).Where("organization_id = ? AND role = ?", orgID, models.RoleAdmin).Count(&adminCount).Error; err != nil {
		writeErrorResponse(w, http.StatusInternalServerError, "Failed to check admin count", "ADMIN_COUNT_ERROR")
		return
	}

	if membership.Role == models.RoleAdmin && adminCount <= 1 {
		writeErrorResponse(w, http.StatusBadRequest, "Cannot remove the last admin from organization", "LAST_ADMIN_ERROR")
		return
	}

	// Delete the membership
	if err := oh.DB.Delete(&membership).Error; err != nil {
		writeErrorResponse(w, http.StatusInternalServerError, "Failed to remove member", "REMOVAL_ERROR")
		return
	}

	// Return success response
	response := map[string]interface{}{
		"message":       "Member removed successfully",
		"membership_id": membership.ID,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}
