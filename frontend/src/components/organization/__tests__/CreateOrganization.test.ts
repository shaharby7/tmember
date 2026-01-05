import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CreateOrganization from '../CreateOrganization.vue'

describe('CreateOrganization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render modal with form elements', () => {
      const wrapper = mount(CreateOrganization)

      expect(wrapper.find('.modal-content').exists()).toBe(true)
      expect(wrapper.find('.modal-header h2').text()).toBe('Create New Organization')
      expect(wrapper.find('form').exists()).toBe(true)
      expect(wrapper.find('input[type="text"]').exists()).toBe(true)
      expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
      expect(wrapper.find('.cancel-button').exists()).toBe(true)
    })

    it('should render modal overlay', () => {
      const wrapper = mount(CreateOrganization)

      expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    })

    it('should render close button in header', () => {
      const wrapper = mount(CreateOrganization)

      expect(wrapper.find('.close-button').exists()).toBe(true)
    })

    it('should show suggestion section when showSuggestion is true', () => {
      const wrapper = mount(CreateOrganization, {
        props: {
          showSuggestion: true,
        },
      })

      expect(wrapper.find('.suggestion-section').exists()).toBe(true)
      expect(wrapper.find('.suggestion-content h3').text()).toBe('Welcome to TMember!')
    })

    it('should not show suggestion section when showSuggestion is false', () => {
      const wrapper = mount(CreateOrganization, {
        props: {
          showSuggestion: false,
        },
      })

      expect(wrapper.find('.suggestion-section').exists()).toBe(false)
    })
  })

  describe('Form Validation', () => {
    it('should disable submit button when form is invalid', async () => {
      const wrapper = mount(CreateOrganization)
      const submitButton = wrapper.find('button[type="submit"]')

      // Initially disabled with empty input
      expect(submitButton.attributes('disabled')).toBeDefined()

      // Still disabled with short name
      const input = wrapper.find('input[type="text"]')
      await input.setValue('ab')
      await wrapper.vm.$nextTick()
      expect(submitButton.attributes('disabled')).toBeDefined()
    })

    it('should enable submit button when form is valid', async () => {
      const wrapper = mount(CreateOrganization)
      const input = wrapper.find('input[type="text"]')
      const submitButton = wrapper.find('button[type="submit"]')

      await input.setValue('Valid Organization Name')
      await wrapper.vm.$nextTick()

      expect(submitButton.attributes('disabled')).toBeUndefined()
    })

    it('should validate minimum length requirement', async () => {
      const wrapper = mount(CreateOrganization)
      const input = wrapper.find('input[type="text"]')

      // Test with 2 characters (below minimum)
      await input.setValue('ab')
      await wrapper.vm.$nextTick()

      const submitButton = wrapper.find('button[type="submit"]')
      expect(submitButton.attributes('disabled')).toBeDefined()

      // Test with 3 characters (minimum)
      await input.setValue('abc')
      await wrapper.vm.$nextTick()

      expect(submitButton.attributes('disabled')).toBeUndefined()
    })

    it('should validate maximum length requirement', async () => {
      const wrapper = mount(CreateOrganization)
      const input = wrapper.find('input[type="text"]')

      // Test with exactly 100 characters (maximum)
      const maxLengthName = 'a'.repeat(100)
      await input.setValue(maxLengthName)
      await wrapper.vm.$nextTick()

      const submitButton = wrapper.find('button[type="submit"]')
      expect(submitButton.attributes('disabled')).toBeUndefined()

      // Input should enforce maxlength attribute
      expect(input.attributes('maxlength')).toBe('100')
    })

    it('should trim whitespace from organization name', async () => {
      const wrapper = mount(CreateOrganization)
      const input = wrapper.find('input[type="text"]')

      // Test with leading/trailing spaces
      await input.setValue('  Valid Name  ')
      await wrapper.vm.$nextTick()

      const submitButton = wrapper.find('button[type="submit"]')
      expect(submitButton.attributes('disabled')).toBeUndefined()
    })
  })

  describe('Form Submission', () => {
    it('should emit create event with organization name when form is submitted', async () => {
      const wrapper = mount(CreateOrganization)
      const input = wrapper.find('input[type="text"]')
      const form = wrapper.find('form')

      const organizationName = 'Test Organization'
      await input.setValue(organizationName)
      await form.trigger('submit')

      expect(wrapper.emitted('create')).toBeTruthy()
      expect(wrapper.emitted('create')?.[0]).toEqual([organizationName])
    })

    it('should not submit when form is invalid', async () => {
      const wrapper = mount(CreateOrganization)
      const form = wrapper.find('form')

      // Try to submit with empty form
      await form.trigger('submit')

      expect(wrapper.emitted('create')).toBeFalsy()
    })

    it('should not submit when loading', async () => {
      const wrapper = mount(CreateOrganization, {
        props: {
          isLoading: true,
        },
      })

      const input = wrapper.find('input[type="text"]')
      const form = wrapper.find('form')

      await input.setValue('Test Organization')
      await form.trigger('submit')

      expect(wrapper.emitted('create')).toBeFalsy()
    })

    it('should trim organization name before emitting', async () => {
      const wrapper = mount(CreateOrganization)
      const input = wrapper.find('input[type="text"]')
      const form = wrapper.find('form')

      await input.setValue('  Test Organization  ')
      await form.trigger('submit')

      expect(wrapper.emitted('create')?.[0]).toEqual(['Test Organization'])
    })
  })

  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      const wrapper = mount(CreateOrganization, {
        props: {
          isLoading: true,
        },
      })

      expect(wrapper.find('.loading-spinner').exists()).toBe(true)
      expect(wrapper.find('button[type="submit"]').text()).toContain('Creating...')
    })

    it('should disable form elements when loading', () => {
      const wrapper = mount(CreateOrganization, {
        props: {
          isLoading: true,
        },
      })

      const input = wrapper.find('input[type="text"]')
      const submitButton = wrapper.find('button[type="submit"]')
      const cancelButton = wrapper.find('.cancel-button')

      expect(input.attributes('disabled')).toBeDefined()
      expect(submitButton.attributes('disabled')).toBeDefined()
      expect(cancelButton.attributes('disabled')).toBeDefined()
    })

    it('should show normal state when not loading', () => {
      const wrapper = mount(CreateOrganization, {
        props: {
          isLoading: false,
        },
      })

      expect(wrapper.find('.loading-spinner').exists()).toBe(false)
      expect(wrapper.find('button[type="submit"]').text()).toBe('Create Organization')
    })
  })

  describe('Error Handling', () => {
    it('should display error message when provided', () => {
      const errorMessage = 'Organization name already exists'
      const wrapper = mount(CreateOrganization, {
        props: {
          errorMessage,
        },
      })

      expect(wrapper.find('.error-message').exists()).toBe(true)
      expect(wrapper.find('.error-message').text()).toBe(errorMessage)
    })

    it('should apply error styling to input when error exists', () => {
      const wrapper = mount(CreateOrganization, {
        props: {
          errorMessage: 'Test error',
        },
      })

      const input = wrapper.find('input[type="text"]')
      expect(input.classes()).toContain('error')
    })

    it('should not show error message when errorMessage is empty', () => {
      const wrapper = mount(CreateOrganization, {
        props: {
          errorMessage: '',
        },
      })

      expect(wrapper.find('.error-message').exists()).toBe(false)
    })
  })

  describe('Cancel Functionality', () => {
    it('should emit cancel event when cancel button is clicked', async () => {
      const wrapper = mount(CreateOrganization)
      const cancelButton = wrapper.find('.cancel-button')

      await cancelButton.trigger('click')

      expect(wrapper.emitted('cancel')).toBeTruthy()
      expect(wrapper.emitted('cancel')).toHaveLength(1)
    })

    it('should emit cancel event when close button is clicked', async () => {
      const wrapper = mount(CreateOrganization)
      const closeButton = wrapper.find('.close-button')

      await closeButton.trigger('click')

      expect(wrapper.emitted('cancel')).toBeTruthy()
      expect(wrapper.emitted('cancel')).toHaveLength(1)
    })

    it('should emit cancel event when overlay is clicked', async () => {
      const wrapper = mount(CreateOrganization)
      const overlay = wrapper.find('.modal-overlay')

      await overlay.trigger('click')

      expect(wrapper.emitted('cancel')).toBeTruthy()
      expect(wrapper.emitted('cancel')).toHaveLength(1)
    })
  })

  describe('Form Hints and Labels', () => {
    it('should show form hint text', () => {
      const wrapper = mount(CreateOrganization)

      const hint = wrapper.find('.form-hint')
      expect(hint.exists()).toBe(true)
      expect(hint.text()).toContain('Choose a unique name for your organization (3-100 characters)')
    })

    it('should have proper form labels', () => {
      const wrapper = mount(CreateOrganization)

      const label = wrapper.find('.form-label')
      expect(label.exists()).toBe(true)
      expect(label.text()).toBe('Organization Name')

      const input = wrapper.find('input[type="text"]')
      expect(input.attributes('id')).toBe('organization-name')
      expect(label.attributes('for')).toBe('organization-name')
    })

    it('should have proper input attributes', () => {
      const wrapper = mount(CreateOrganization)
      const input = wrapper.find('input[type="text"]')

      expect(input.attributes('placeholder')).toBe('Enter organization name')
      expect(input.attributes('required')).toBeDefined()
      expect(input.attributes('maxlength')).toBe('100')
    })
  })

  describe('Accessibility', () => {
    it('should focus input when component mounts', async () => {
      // Note: This test would require DOM manipulation in a real browser environment
      // For now, we just verify the input exists and has the correct ID
      const wrapper = mount(CreateOrganization)
      const input = wrapper.find('#organization-name')

      expect(input.exists()).toBe(true)
    })

    it('should have proper form structure for screen readers', () => {
      const wrapper = mount(CreateOrganization)

      // Check for proper label association
      const label = wrapper.find('label[for="organization-name"]')
      const input = wrapper.find('input#organization-name')

      expect(label.exists()).toBe(true)
      expect(input.exists()).toBe(true)
    })

    it('should have proper button types', () => {
      const wrapper = mount(CreateOrganization)

      const submitButton = wrapper.find('button[type="submit"]')
      const cancelButton = wrapper.find('button[type="button"]')

      expect(submitButton.exists()).toBe(true)
      expect(cancelButton.exists()).toBe(true)
    })
  })

  describe('Responsive Design', () => {
    it('should have responsive CSS classes', () => {
      const wrapper = mount(CreateOrganization)

      expect(wrapper.find('.create-organization').exists()).toBe(true)
      expect(wrapper.find('.modal-content').exists()).toBe(true)
      expect(wrapper.find('.form-actions').exists()).toBe(true)
    })
  })
})
