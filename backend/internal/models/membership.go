package models

import (
	"time"

	"gorm.io/gorm"
)

// Role represents the role of a user in an organization
type Role string

const (
	RoleAdmin  Role = "admin"
	RoleMember Role = "member"
)

// OrganizationMembership represents the relationship between a user and an organization
type OrganizationMembership struct {
	ID             uint           `json:"id" gorm:"primaryKey"`
	UserID         uint           `json:"user_id" gorm:"not null;index"`
	OrganizationID uint           `json:"organization_id" gorm:"not null;index"`
	Role           Role           `json:"role" gorm:"type:enum('admin','member');not null" binding:"required,oneof=admin member"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `json:"-" gorm:"index"`

	// Associations
	User         User         `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Organization Organization `json:"organization,omitempty" gorm:"foreignKey:OrganizationID"`
}

// TableName specifies the table name for the OrganizationMembership model
func (OrganizationMembership) TableName() string {
	return "organization_memberships"
}

// BeforeCreate is a GORM hook that runs before creating a new membership
func (om *OrganizationMembership) BeforeCreate(tx *gorm.DB) error {
	// Ensure role is valid
	if om.Role != RoleAdmin && om.Role != RoleMember {
		om.Role = RoleMember // Default to member if invalid
	}
	return nil
}
