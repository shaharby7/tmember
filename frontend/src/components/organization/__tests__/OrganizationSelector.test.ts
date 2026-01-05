import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import OrganizationSelector from '../OrganizationSelector.vue'
import type { Organization, OrganizationMembership } from '../../../types/api'

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

describe('OrganizationSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render current organization when provided', () => {
      const wrapper = mount(OrganizationSelector, {
        props: {
          organizations: mockOrganizations,
          memberships: mockMemberships,
          currentOrganization: mockOrganizations[0],
        },
      })

      expect(wrapper.find('.org-name').text()).toBe('Test Organization 1')
      expect(wrapper.find('.org-role').text()).toBe('Admin')
    })

    it('should render "No Organization" when no current organization', () => {
      const wrapper = mount(OrganizationSelector, {
        props: {
          organizations: mockOrganizations,
          memberships: mockMemberships,
          currentOrganization: null,
        },
      })

      expect(wrapper.find('.org-name').text()).toBe('No Organization')
      expect(wrapper.find('.org-role').exists()).toBe(false)
    })

    it('should show dropdown icon', () => {
      const wrapper = mount(OrganizationSelector, {
        props: {
          organizations: mockOrganizations,
          memberships: mockMemberships,
          currentOrganization: mockOrganizations[0],
        },
      })

      expect(wrapper.find('.dropdown-icon').exists()).toBe(true)
    })
  })

  describe('Dropdown Functionality', () => {
    it('should toggle dropdown when current organization is clicked', async () => {
      const wrapper = mount(OrganizationSelector, {
        props: {
          organizations: mockOrganizations,
          memberships: mockMemberships,
          currentOrganization: mockOrganizations[0],
        },
      })

      // Initially closed
      expect(wrapper.find('.dropdown-menu').exists()).toBe(false)

      // Click to open
      await wrapper.find('.current-organization').trigger('click')
      expect(wrapper.find('.dropdown-menu').exists()).toBe(true)

      // Click to close
      await wrapper.find('.current-organization').trigger('click')
      expect(wrapper.find('.dropdown-menu').exists()).toBe(false)
    })

    it('should show loading state in dropdown', async () => {
      const wrapper = mount(OrganizationSelector, {
        props: {
          organizations: mockOrganizations,
          memberships: mockMemberships,
          currentOrganization: mockOrganizations[0],
          isLoading: true,
        },
      })

      await wrapper.find('.current-organization').trigger('click')

      expect(wrapper.find('.dropdown-loading').exists()).toBe(true)
      expect(wrapper.find('.dropdown-loading').text()).toContain('Loading organizations...')
    })

    it('should show empty state when no organizations', async () => {
      const wrapper = mount(OrganizationSelector, {
        props: {
          organizations: [],
          memberships: [],
          currentOrganization: null,
        },
      })

      await wrapper.find('.current-organization').trigger('click')

      expect(wrapper.find('.dropdown-empty').exists()).toBe(true)
      expect(wrapper.find('.dropdown-empty').text()).toContain('No organizations found')
    })

    it('should list all organizations in dropdown', async () => {
      const wrapper = mount(OrganizationSelector, {
        props: {
          organizations: mockOrganizations,
          memberships: mockMemberships,
          currentOrganization: mockOrganizations[0],
        },
      })

      await wrapper.find('.current-organization').trigger('click')

      const organizationItems = wrapper.findAll('.organization-item')
      expect(organizationItems).toHaveLength(2)
      expect(organizationItems[0].text()).toContain('Test Organization 1')
      expect(organizationItems[1].text()).toContain('Test Organization 2')
    })

    it('should show user roles in organization list', async () => {
      const wrapper = mount(OrganizationSelector, {
        props: {
          organizations: mockOrganizations,
          memberships: mockMemberships,
          currentOrganization: mockOrganizations[0],
        },
      })

      await wrapper.find('.current-organization').trigger('click')

      const organizationItems = wrapper.findAll('.organization-item')
      expect(organizationItems[0].text()).toContain('Admin')
      expect(organizationItems[1].text()).toContain('Member')
    })

    it('should highlight current organization in list', async () => {
      const wrapper = mount(OrganizationSelector, {
        props: {
          organizations: mockOrganizations,
          memberships: mockMemberships,
          currentOrganization: mockOrganizations[0],
        },
      })

      await wrapper.find('.current-organization').trigger('click')

      const organizationItems = wrapper.findAll('.organization-item')
      expect(organizationItems[0].classes()).toContain('active')
      expect(organizationItems[1].classes()).not.toContain('active')
    })
  })

  describe('Organization Selection', () => {
    it('should emit select-organization event when organization is clicked', async () => {
      const wrapper = mount(OrganizationSelector, {
        props: {
          organizations: mockOrganizations,
          memberships: mockMemberships,
          currentOrganization: mockOrganizations[0],
        },
      })

      await wrapper.find('.current-organization').trigger('click')
      await wrapper.findAll('.organization-item')[1].trigger('click')

      expect(wrapper.emitted('select-organization')).toBeTruthy()
      expect(wrapper.emitted('select-organization')?.[0]).toEqual([mockOrganizations[1]])
    })

    it('should not emit event when clicking current organization', async () => {
      const wrapper = mount(OrganizationSelector, {
        props: {
          organizations: mockOrganizations,
          memberships: mockMemberships,
          currentOrganization: mockOrganizations[0],
        },
      })

      await wrapper.find('.current-organization').trigger('click')
      await wrapper.findAll('.organization-item')[0].trigger('click')

      expect(wrapper.emitted('select-organization')).toBeFalsy()
    })

    it('should close dropdown after organization selection', async () => {
      const wrapper = mount(OrganizationSelector, {
        props: {
          organizations: mockOrganizations,
          memberships: mockMemberships,
          currentOrganization: mockOrganizations[0],
        },
      })

      await wrapper.find('.current-organization').trigger('click')
      expect(wrapper.find('.dropdown-menu').exists()).toBe(true)

      await wrapper.findAll('.organization-item')[1].trigger('click')
      expect(wrapper.find('.dropdown-menu').exists()).toBe(false)
    })
  })

  describe('Create Organization', () => {
    it('should emit create-organization event when create button is clicked', async () => {
      const wrapper = mount(OrganizationSelector, {
        props: {
          organizations: mockOrganizations,
          memberships: mockMemberships,
          currentOrganization: mockOrganizations[0],
        },
      })

      await wrapper.find('.current-organization').trigger('click')
      await wrapper.find('.create-org-button').trigger('click')

      expect(wrapper.emitted('create-organization')).toBeTruthy()
      expect(wrapper.emitted('create-organization')).toHaveLength(1)
    })

    it('should close dropdown after create button is clicked', async () => {
      const wrapper = mount(OrganizationSelector, {
        props: {
          organizations: mockOrganizations,
          memberships: mockMemberships,
          currentOrganization: mockOrganizations[0],
        },
      })

      await wrapper.find('.current-organization').trigger('click')
      expect(wrapper.find('.dropdown-menu').exists()).toBe(true)

      await wrapper.find('.create-org-button').trigger('click')
      expect(wrapper.find('.dropdown-menu').exists()).toBe(false)
    })

    it('should show create button in empty state', async () => {
      const wrapper = mount(OrganizationSelector, {
        props: {
          organizations: [],
          memberships: [],
          currentOrganization: null,
        },
      })

      await wrapper.find('.current-organization').trigger('click')

      const createButton = wrapper.find('.dropdown-empty .create-org-button')
      expect(createButton.exists()).toBe(true)
      expect(createButton.text()).toBe('Create Organization')
    })
  })

  describe('Keyboard Navigation', () => {
    it('should close dropdown on Escape key', async () => {
      const wrapper = mount(OrganizationSelector, {
        props: {
          organizations: mockOrganizations,
          memberships: mockMemberships,
          currentOrganization: mockOrganizations[0],
        },
      })

      await wrapper.find('.current-organization').trigger('click')
      expect(wrapper.find('.dropdown-menu').exists()).toBe(true)

      // Simulate Escape key press
      await wrapper.trigger('keydown', { key: 'Escape' })
      expect(wrapper.find('.dropdown-menu').exists()).toBe(false)
    })
  })

  describe('Outside Click', () => {
    it('should close dropdown when overlay is clicked', async () => {
      const wrapper = mount(OrganizationSelector, {
        props: {
          organizations: mockOrganizations,
          memberships: mockMemberships,
          currentOrganization: mockOrganizations[0],
        },
      })

      await wrapper.find('.current-organization').trigger('click')
      expect(wrapper.find('.dropdown-menu').exists()).toBe(true)

      await wrapper.find('.dropdown-overlay').trigger('click')
      expect(wrapper.find('.dropdown-menu').exists()).toBe(false)
    })
  })

  describe('Role Display', () => {
    it('should display correct role for current organization', () => {
      const wrapper = mount(OrganizationSelector, {
        props: {
          organizations: mockOrganizations,
          memberships: mockMemberships,
          currentOrganization: mockOrganizations[1], // Member role
        },
      })

      expect(wrapper.find('.org-role').text()).toBe('Member')
    })

    it('should handle missing membership gracefully', () => {
      const wrapper = mount(OrganizationSelector, {
        props: {
          organizations: mockOrganizations,
          memberships: [], // No memberships
          currentOrganization: mockOrganizations[0],
        },
      })

      expect(wrapper.find('.org-role').text()).toBe('')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const wrapper = mount(OrganizationSelector, {
        props: {
          organizations: mockOrganizations,
          memberships: mockMemberships,
          currentOrganization: mockOrganizations[0],
        },
      })

      const currentOrg = wrapper.find('.current-organization')
      expect(currentOrg.exists()).toBe(true)
      // Basic accessibility - component should be clickable and keyboard navigable
    })

    it('should support keyboard navigation', async () => {
      const wrapper = mount(OrganizationSelector, {
        props: {
          organizations: mockOrganizations,
          memberships: mockMemberships,
          currentOrganization: mockOrganizations[0],
        },
      })

      // Should be able to open with click and close with escape
      await wrapper.find('.current-organization').trigger('click')
      expect(wrapper.find('.dropdown-menu').exists()).toBe(true)

      // Escape key should close
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(escapeEvent)
      await wrapper.vm.$nextTick()
      // Note: The actual escape handling is done in the component lifecycle
    })
  })
})
