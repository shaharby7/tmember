package models

// AllModels returns a slice of all model structs for migration purposes
func AllModels() []interface{} {
	return []interface{}{
		&User{},
		&Organization{},
		&OrganizationMembership{},
	}
}
