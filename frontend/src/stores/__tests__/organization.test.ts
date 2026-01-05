import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useOrganizationStore } from '../organization'
import type { Organization, OrganizationMembership, ApiResponse } from '../../types/api'

// Mock the API functions
vi.mock('../../services/api', () => ({
  getUserOrganizations: vi.fn(),
  createOrganization: vi.fn(),
  switchOrganization: vi.fn(),
  setCurrentOrganizationContext: vi.fn(),
}))

import {
  getUserOrganizations,
  createOrganization as apiCreateOrganization,
  switchOrganization as apiSwitchOrganization,
  setCurrentOrganizationContext,
} from '../../services/api'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock organizations and memberships for testing
const mockOrganizations: Organization[] = [
  {
    id: 1,
    name: 'Test Organization 1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Test Organization 2',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

const mockMemberships: OrganizationMembership[] = [
  {
    id: 1,
    user_id: 1,
    organization_id: 1,
    role: 'admin',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    user_id: 1,
    organization_id: 2,
    role: 'member',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

describe('Organization Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = useOrganizationStore()

      expect(store.organizations).toEqual([])
      expect(store.memberships).toEqual([])
      expect(store.currentOrganization).toBeNull()
      expect(store.isLoading).toBe(false)
      expect(store.lastError).toBeNull()
      expect(store.hasOrganizations).toBe(false)
      expect(store.currentUserRole).toBeNull()
      expect(store.isCurrentUserAdmin).toBe(false)
    })
  })

  describe('Load Organizations', () => {
    it('should load organizations successfully', async () => {
      const store = useOrganizationStore()
      const mockResponse: ApiResponse<{ organizations: Organization[] }> = {
        success: true,
        data: { organizations: mockOrganizations },
      }

      vi.mocked(getUserOrganizations).mockResolvedValue(mockResponse)

      const result = await store.loadOrganizations()

      expect(result).toBe(true)
      expect(store.organizations).toEqual(mockOrganizations)
      expect(store.currentOrganization).toEqual(mockOrganizations[0])
      expect(store.isLoading).toBe(false)
      expect(store.lastError).toBeNull()
    })

    it('should handle load organizations error', async () => {
      const store = useOrganizationStore()
      const mockResponse: ApiResponse<{ organizations: Organization[] }> = {
        success: false,
        error: { error: 'network_error', message: 'Failed to load organizations' },
      }

      vi.mocked(getUserOrganizations).mockResolvedValue(mockResponse)

      const result = await store.loadOrganizations()

      expect(result).toBe(false)
      expect(store.organizations).toEqual([])
      expect(store.lastError).toBe('Failed to load organizations')
      expect(store.isLoading).toBe(false)
    })

    it('should restore current organization from localStorage', async () => {
      const store = useOrganizationStore()
      const storedOrg = JSON.stringify(mockOrganizations[1])
      localStorageMock.getItem.mockReturnValue(storedOrg)

      const mockResponse: ApiResponse<{ organizations: Organization[] }> = {
        success: true,
        data: { organizations: mockOrganizations },
      }

      vi.mocked(getUserOrganizations).mockResolvedValue(mockResponse)

      await store.loadOrganizations()

      expect(store.currentOrganization).toEqual(mockOrganizations[1])
    })

    it('should handle invalid localStorage data', async () => {
      const store = useOrganizationStore()
      localStorageMock.getItem.mockReturnValue('invalid-json')

      const mockResponse: ApiResponse<{ organizations: Organization[] }> = {
        success: true,
        data: { organizations: mockOrganizations },
      }

      vi.mocked(getUserOrganizations).mockResolvedValue(mockResponse)

      await store.loadOrganizations()

      expect(store.currentOrganization).toEqual(mockOrganizations[0])
    })
  })

  describe('Create Organization', () => {
    it('should create organization successfully', async () => {
      const store = useOrganizationStore()
      const newOrg: Organization = {
        id: 3,
        name: 'New Organization',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mockResponse: ApiResponse<{ organization: Organization }> = {
        success: true,
        data: { organization: newOrg },
      }

      vi.mocked(apiCreateOrganization).mockResolvedValue(mockResponse)

      const result = await store.createOrganization('New Organization')

      expect(result).toBe(true)
      expect(store.organizations).toContain(newOrg)
      expect(store.currentOrganization).toEqual(newOrg)
      expect(store.isLoading).toBe(false)
      expect(store.lastError).toBeNull()
    })

    it('should handle create organization error', async () => {
      const store = useOrganizationStore()
      const mockResponse: ApiResponse<{ organization: Organization }> = {
        success: false,
        error: { error: 'validation_error', message: 'Organization name already exists' },
      }

      vi.mocked(apiCreateOrganization).mockResolvedValue(mockResponse)

      const result = await store.createOrganization('Duplicate Name')

      expect(result).toBe(false)
      expect(store.lastError).toBe('Organization name already exists')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('Switch Organization', () => {
    it('should switch organization successfully', async () => {
      const store = useOrganizationStore()
      const targetOrg = mockOrganizations[1]

      const mockResponse: ApiResponse<{ organization: Organization }> = {
        success: true,
        data: { organization: targetOrg },
      }

      vi.mocked(apiSwitchOrganization).mockResolvedValue(mockResponse)

      const result = await store.switchOrganization(targetOrg.id)

      expect(result).toBe(true)
      expect(store.currentOrganization).toEqual(targetOrg)
      expect(setCurrentOrganizationContext).toHaveBeenCalledWith(targetOrg.id)
      expect(store.isLoading).toBe(false)
      expect(store.lastError).toBeNull()
    })

    it('should handle switch organization error', async () => {
      const store = useOrganizationStore()
      const mockResponse: ApiResponse<{ organization: Organization }> = {
        success: false,
        error: { error: 'access_denied', message: 'You do not have access to this organization' },
      }

      vi.mocked(apiSwitchOrganization).mockResolvedValue(mockResponse)

      const result = await store.switchOrganization(999)

      expect(result).toBe(false)
      expect(store.lastError).toBe('You do not have access to this organization')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('Organization Management', () => {
    it('should add organization correctly', () => {
      const store = useOrganizationStore()
      const newOrg = mockOrganizations[0]
      const newMembership = mockMemberships[0]

      store.addOrganization(newOrg, newMembership)

      expect(store.organizations).toContain(newOrg)
      expect(store.memberships).toContain(newMembership)
    })

    it('should update existing organization', () => {
      const store = useOrganizationStore()
      const org = mockOrganizations[0]
      const membership = mockMemberships[0]

      // Add organization first
      store.addOrganization(org, membership)

      // Update with same ID
      const updatedOrg = { ...org, name: 'Updated Name' }
      const updatedMembership = { ...membership, role: 'member' as const }

      store.addOrganization(updatedOrg, updatedMembership)

      expect(store.organizations).toHaveLength(1)
      expect(store.organizations[0].name).toBe('Updated Name')
      expect(store.memberships[0].role).toBe('member')
    })

    it('should remove organization correctly', () => {
      const store = useOrganizationStore()

      // Set up initial state
      store.organizations.push(...mockOrganizations)
      store.memberships.push(...mockMemberships)
      store.currentOrganization = mockOrganizations[0]

      store.removeOrganization(mockOrganizations[0].id)

      expect(store.organizations).not.toContain(mockOrganizations[0])
      expect(
        store.memberships.find((m) => m.organization_id === mockOrganizations[0].id),
      ).toBeUndefined()
      expect(store.currentOrganization).toEqual(mockOrganizations[1])
    })

    it('should clear current organization when removing last organization', () => {
      const store = useOrganizationStore()

      // Set up with single organization
      store.organizations.push(mockOrganizations[0])
      store.memberships.push(mockMemberships[0])
      store.currentOrganization = mockOrganizations[0]

      store.removeOrganization(mockOrganizations[0].id)

      expect(store.organizations).toHaveLength(0)
      expect(store.currentOrganization).toBeNull()
    })

    it('should update organization details', () => {
      const store = useOrganizationStore()
      store.organizations.push(...mockOrganizations)
      store.currentOrganization = mockOrganizations[0]

      const updates = { name: 'Updated Organization Name' }
      store.updateOrganization(mockOrganizations[0].id, updates)

      expect(store.organizations[0].name).toBe('Updated Organization Name')
      expect(store.currentOrganization?.name).toBe('Updated Organization Name')
    })
  })

  describe('Computed Properties', () => {
    it('should calculate hasOrganizations correctly', () => {
      const store = useOrganizationStore()

      expect(store.hasOrganizations).toBe(false)

      store.organizations.push(mockOrganizations[0])
      expect(store.hasOrganizations).toBe(true)
    })

    it('should calculate currentUserRole correctly', () => {
      const store = useOrganizationStore()
      store.currentOrganization = mockOrganizations[0]
      store.memberships.push(mockMemberships[0])

      expect(store.currentUserRole).toBe('admin')
    })

    it('should calculate isCurrentUserAdmin correctly', () => {
      const store = useOrganizationStore()
      store.currentOrganization = mockOrganizations[0]
      store.memberships.push(mockMemberships[0])

      expect(store.isCurrentUserAdmin).toBe(true)

      // Change to member role
      store.memberships[0].role = 'member'
      expect(store.isCurrentUserAdmin).toBe(false)
    })
  })

  describe('Utility Methods', () => {
    it('should get organization by ID', () => {
      const store = useOrganizationStore()
      store.organizations.push(...mockOrganizations)

      const org = store.getOrganizationById(mockOrganizations[0].id)
      expect(org).toEqual(mockOrganizations[0])

      const nonExistent = store.getOrganizationById(999)
      expect(nonExistent).toBeNull()
    })

    it('should get user role in organization', () => {
      const store = useOrganizationStore()
      store.memberships.push(...mockMemberships)

      const role = store.getUserRoleInOrganization(mockOrganizations[0].id)
      expect(role).toBe('admin')

      const noRole = store.getUserRoleInOrganization(999)
      expect(noRole).toBeNull()
    })

    it('should check if user is admin in organization', () => {
      const store = useOrganizationStore()
      store.memberships.push(...mockMemberships)

      const isAdmin = store.isUserAdminInOrganization(mockOrganizations[0].id)
      expect(isAdmin).toBe(true)

      const isNotAdmin = store.isUserAdminInOrganization(mockOrganizations[1].id)
      expect(isNotAdmin).toBe(false)
    })
  })

  describe('State Management', () => {
    it('should clear all organizations', () => {
      const store = useOrganizationStore()
      store.organizations.push(...mockOrganizations)
      store.memberships.push(...mockMemberships)
      store.currentOrganization = mockOrganizations[0]
      store.lastError = 'Some error'
      store.isLoading = true

      store.clearOrganizations()

      expect(store.organizations).toEqual([])
      expect(store.memberships).toEqual([])
      expect(store.currentOrganization).toBeNull()
      expect(store.lastError).toBeNull()
      expect(store.isLoading).toBe(false)
    })

    it('should clear errors', () => {
      const store = useOrganizationStore()
      store.lastError = 'Some error'

      store.clearError()

      expect(store.lastError).toBeNull()
    })

    it('should initialize organizations from localStorage', () => {
      const storedOrg = JSON.stringify(mockOrganizations[0])
      localStorageMock.getItem.mockReturnValue(storedOrg)

      const store = useOrganizationStore()
      store.initializeOrganizations()

      expect(store.currentOrganization).toEqual(mockOrganizations[0])
      expect(setCurrentOrganizationContext).toHaveBeenCalledWith(mockOrganizations[0].id)
    })

    it('should handle invalid localStorage data during initialization', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json')

      const store = useOrganizationStore()
      store.initializeOrganizations()

      expect(store.currentOrganization).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('current_organization')
    })
  })

  describe('LocalStorage Integration', () => {
    it('should save current organization to localStorage', () => {
      const store = useOrganizationStore()
      const org = mockOrganizations[0]

      store.currentOrganization = org

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'current_organization',
        JSON.stringify(org),
      )
      expect(setCurrentOrganizationContext).toHaveBeenCalledWith(org.id)
    })

    it('should remove current organization from localStorage when set to null', () => {
      const store = useOrganizationStore()

      store.currentOrganization = null

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('current_organization')
      expect(setCurrentOrganizationContext).toHaveBeenCalledWith(null)
    })
  })
})
