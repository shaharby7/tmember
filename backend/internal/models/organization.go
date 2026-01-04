package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"gorm.io/gorm"
)

// BillingDetails represents the billing information for an organization
type BillingDetails map[string]interface{}

// Value implements the driver.Valuer interface for database storage
func (bd BillingDetails) Value() (driver.Value, error) {
	if bd == nil {
		return nil, nil
	}
	return json.Marshal(bd)
}

// Scan implements the sql.Scanner interface for database retrieval
func (bd *BillingDetails) Scan(value interface{}) error {
	if value == nil {
		*bd = nil
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("cannot scan %T into BillingDetails", value)
	}

	return json.Unmarshal(bytes, bd)
}

// Organization represents an organization in the system
type Organization struct {
	ID             uint            `json:"id" gorm:"primaryKey"`
	Name           string          `json:"name" gorm:"uniqueIndex;not null" binding:"required"`
	BillingDetails *BillingDetails `json:"billing_details" gorm:"type:json"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
	DeletedAt      gorm.DeletedAt  `json:"-" gorm:"index"`

	// Associations
	Memberships []OrganizationMembership `json:"memberships,omitempty" gorm:"foreignKey:OrganizationID"`
}

// TableName specifies the table name for the Organization model
func (Organization) TableName() string {
	return "organizations"
}
