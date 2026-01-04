package models

// HealthResponse represents the health check response
type HealthResponse struct {
	Status string `json:"status"`
}

// EchoRequest represents the echo API request
type EchoRequest struct {
	Message string `json:"message"`
}

// EchoResponse represents the echo API response
type EchoResponse struct {
	Echo string `json:"echo"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
	Code    string `json:"code,omitempty"`
}

// CreateOrganizationRequest represents the request to create an organization
type CreateOrganizationRequest struct {
	Name string `json:"name" binding:"required"`
}

// OrganizationResponse represents an organization in API responses
type OrganizationResponse struct {
	ID             uint            `json:"id"`
	Name           string          `json:"name"`
	BillingDetails *BillingDetails `json:"billing_details"`
	CreatedAt      string          `json:"created_at"`
	UpdatedAt      string          `json:"updated_at"`
	Role           string          `json:"role,omitempty"` // User's role in this organization
}

// ListOrganizationsResponse represents the response for listing organizations
type ListOrganizationsResponse struct {
	Organizations []OrganizationResponse `json:"organizations"`
}

// SwitchOrganizationResponse represents the response for switching organizations
type SwitchOrganizationResponse struct {
	Organization OrganizationResponse `json:"organization"`
	Message      string               `json:"message"`
}
