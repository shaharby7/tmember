import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getUserOrganizations,
  createOrganization as apiCreateOrganization,
  switchOrganization as apiSwitchOrganization,
  setCurrentOrganizationContext,
} from '../services/api'
import type { Organization, OrganizationMembership, ApiResponse } from '../types/api'

export const useOrganizationStore = defineStore('organization', () => {
  // State
  const organizations = ref<Organization[]>([])
  const memberships = ref<OrganizationMembership[]>([])
  const currentOrganization = ref<Organization | null>(null)
  const isLoading = ref(false)
  const lastError = ref<string | null>(null)

  // Computed
  const hasOrganizations = computed(() => {
    return organizations.value.length > 0
  })

  const currentUserRole = computed(() => {
    if (!currentOrganization.value) return null

    const membership = memberships.value.find(
      (m) => m.organization_id === currentOrganization.value!.id,
    )
    return membership?.role || null
  })

  const isCurrentUserAdmin = computed(() => {
    return currentUserRole.value === 'admin'
  })

  // Actions
  const setOrganizations = (orgs: Organization[]) => {
    organizations.value = orgs
  }

  const setMemberships = (membershipList: OrganizationMembership[]) => {
    memberships.value = membershipList
  }

  const setCurrentOrganization = (org: Organization | null) => {
    currentOrganization.value = org

    // Store current organization in localStorage for persistence
    if (org) {
      localStorage.setItem('current_organization', JSON.stringify(org))
      // Update API client context
      setCurrentOrganizationContext(org.id)
    } else {
      localStorage.removeItem('current_organization')
      // Clear API client context
      setCurrentOrganizationContext(null)
    }
  }

  const setError = (error: string | null) => {
    lastError.value = error
  }

  const clearError = () => {
    lastError.value = null
  }

  const setLoading = (loading: boolean) => {
    isLoading.value = loading
  }

  /**
   * Load organizations and memberships for the current user
   */
  const loadOrganizations = async (): Promise<boolean> => {
    try {
      setLoading(true)
      clearError()

      const result = await getUserOrganizations()

      if (result.success && result.data) {
        setOrganizations(result.data.organizations)

        // If we have organizations but no current organization set, set the first one
        if (result.data.organizations.length > 0 && !currentOrganization.value) {
          // Try to restore from localStorage first
          const storedOrg = localStorage.getItem('current_organization')
          if (storedOrg) {
            try {
              const parsedOrg = JSON.parse(storedOrg)
              const foundOrg = result.data.organizations.find((org) => org.id === parsedOrg.id)
              if (foundOrg) {
                setCurrentOrganization(foundOrg)
              } else {
                // Stored org not found, use first available
                setCurrentOrganization(result.data.organizations[0])
              }
            } catch {
              // Invalid stored data, use first available
              setCurrentOrganization(result.data.organizations[0])
            }
          } else {
            // No stored org, use first available
            setCurrentOrganization(result.data.organizations[0])
          }
        }

        return true
      } else {
        setError(result.error?.message || 'Failed to load organizations')
        return false
      }
    } catch (error) {
      const errorMessage = 'An unexpected error occurred while loading organizations'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  /**
   * Create a new organization
   */
  const createOrganization = async (name: string): Promise<boolean> => {
    try {
      setLoading(true)
      clearError()

      const result = await apiCreateOrganization(name)

      if (result.success && result.data) {
        // Add the new organization to the list
        const newOrg = result.data.organization
        setOrganizations([...organizations.value, newOrg])

        // Set as current organization
        setCurrentOrganization(newOrg)

        // Create a membership entry for the creator (admin role)
        const newMembership: OrganizationMembership = {
          id: Date.now(), // Temporary ID, should come from backend
          user_id: 0, // Will be set by backend
          organization_id: newOrg.id,
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setMemberships([...memberships.value, newMembership])

        return true
      } else {
        setError(result.error?.message || 'Failed to create organization')
        return false
      }
    } catch (error) {
      const errorMessage = 'An unexpected error occurred while creating organization'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  /**
   * Switch to a different organization
   */
  const switchOrganization = async (organizationId: number): Promise<boolean> => {
    try {
      setLoading(true)
      clearError()

      const result = await apiSwitchOrganization(organizationId)

      if (result.success && result.data) {
        const org = result.data.organization
        setCurrentOrganization(org)
        return true
      } else {
        setError(result.error?.message || 'Failed to switch organization')
        return false
      }
    } catch (error) {
      const errorMessage = 'An unexpected error occurred while switching organization'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  /**
   * Add an organization to the list (used when joining an organization)
   */
  const addOrganization = (organization: Organization, membership: OrganizationMembership) => {
    // Check if organization already exists
    const existingIndex = organizations.value.findIndex((org) => org.id === organization.id)

    if (existingIndex === -1) {
      setOrganizations([...organizations.value, organization])
    } else {
      // Update existing organization
      const updatedOrgs = [...organizations.value]
      updatedOrgs[existingIndex] = organization
      setOrganizations(updatedOrgs)
    }

    // Add or update membership
    const existingMembershipIndex = memberships.value.findIndex(
      (m) => m.organization_id === organization.id,
    )

    if (existingMembershipIndex === -1) {
      setMemberships([...memberships.value, membership])
    } else {
      // Update existing membership
      const updatedMemberships = [...memberships.value]
      updatedMemberships[existingMembershipIndex] = membership
      setMemberships(updatedMemberships)
    }
  }

  /**
   * Remove an organization from the list (used when leaving an organization)
   */
  const removeOrganization = (organizationId: number) => {
    // Remove organization
    setOrganizations(organizations.value.filter((org) => org.id !== organizationId))

    // Remove membership
    setMemberships(memberships.value.filter((m) => m.organization_id !== organizationId))

    // If this was the current organization, switch to another one or clear
    if (currentOrganization.value?.id === organizationId) {
      if (organizations.value.length > 0) {
        setCurrentOrganization(organizations.value[0])
      } else {
        setCurrentOrganization(null)
      }
    }
  }

  /**
   * Update organization details
   */
  const updateOrganization = (organizationId: number, updates: Partial<Organization>) => {
    const index = organizations.value.findIndex((org) => org.id === organizationId)
    if (index !== -1) {
      const updatedOrgs = [...organizations.value]
      updatedOrgs[index] = { ...updatedOrgs[index], ...updates }
      setOrganizations(updatedOrgs)

      // Update current organization if it's the one being updated
      if (currentOrganization.value?.id === organizationId) {
        setCurrentOrganization(updatedOrgs[index])
      }
    }
  }

  /**
   * Clear all organization data (used on logout)
   */
  const clearOrganizations = () => {
    setOrganizations([])
    setMemberships([])
    setCurrentOrganization(null)
    clearError()
    setLoading(false)
  }

  /**
   * Initialize organization state from localStorage
   */
  const initializeOrganizations = () => {
    const storedOrg = localStorage.getItem('current_organization')
    if (storedOrg) {
      try {
        const parsedOrg = JSON.parse(storedOrg)
        setCurrentOrganization(parsedOrg)
      } catch {
        // Invalid stored data, ignore
        localStorage.removeItem('current_organization')
      }
    }
  }

  /**
   * Get organization by ID
   */
  const getOrganizationById = (id: number): Organization | null => {
    return organizations.value.find((org) => org.id === id) || null
  }

  /**
   * Get user's role in a specific organization
   */
  const getUserRoleInOrganization = (organizationId: number): string | null => {
    const membership = memberships.value.find((m) => m.organization_id === organizationId)
    return membership?.role || null
  }

  /**
   * Check if user is admin in a specific organization
   */
  const isUserAdminInOrganization = (organizationId: number): boolean => {
    return getUserRoleInOrganization(organizationId) === 'admin'
  }

  return {
    // State
    organizations: computed(() => organizations.value),
    memberships: computed(() => memberships.value),
    currentOrganization: computed(() => currentOrganization.value),
    isLoading: computed(() => isLoading.value),
    lastError: computed(() => lastError.value),

    // Computed
    hasOrganizations,
    currentUserRole,
    isCurrentUserAdmin,

    // Actions
    loadOrganizations,
    createOrganization,
    switchOrganization,
    addOrganization,
    removeOrganization,
    updateOrganization,
    clearOrganizations,
    initializeOrganizations,
    getOrganizationById,
    getUserRoleInOrganization,
    isUserAdminInOrganization,
    clearError,
  }
})
