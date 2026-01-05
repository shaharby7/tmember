import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SignupForm from '../SignupForm.vue'
import type { RegisterRequest } from '../../../types/api'

describe('SignupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render all required form elements', () => {
      const wrapper = mount(SignupForm)

      // Check for main form elements
      expect(wrapper.find('h2').text()).toBe('Create Account')
      expect(wrapper.find('form').exists()).toBe(true)
      expect(wrapper.find('input[id="signup-email"]').exists()).toBe(true)
      expect(wrapper.find('input[id="signup-password"]').exists()).toBe(true)
      expect(wrapper.find('input[id="confirm-password"]').exists()).toBe(true)
      expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
    })

    it('should display password requirements', () => {
      const wrapper = mount(SignupForm)

      const requirements = wrapper.find('.password-requirements')
      expect(requirements.exists()).toBe(true)
      expect(requirements.text()).toContain('Password must:')
      expect(requirements.text()).toContain('Be at least 8 characters long')
      expect(requirements.text()).toContain('Contain at least one uppercase letter')
      expect(requirements.text()).toContain('Contain at least one lowercase letter')
      expect(requirements.text()).toContain('Contain at least one number')
    })

    it('should display toggle text for login', () => {
      const wrapper = mount(SignupForm)

      const toggleText = wrapper.find('.toggle-text')
      expect(toggleText.exists()).toBe(true)
      expect(toggleText.text()).toContain('Already have an account?')
      expect(toggleText.text()).toContain('Sign in here')
    })
  })

  describe('Email Validation', () => {
    it('should validate email format on blur', async () => {
      const wrapper = mount(SignupForm)
      const emailInput = wrapper.find('input[id="signup-email"]')

      // Test invalid email
      await emailInput.setValue('invalid-email')
      await emailInput.trigger('blur')
      await wrapper.vm.$nextTick()

      const errorMessage = wrapper.find('.error-message')
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.text()).toBe('Please enter a valid email address')
    })

    it('should validate required email field', async () => {
      const wrapper = mount(SignupForm)
      const emailInput = wrapper.find('input[id="signup-email"]')

      // Test empty email
      await emailInput.setValue('')
      await emailInput.trigger('blur')
      await wrapper.vm.$nextTick()

      const errorMessage = wrapper.find('.error-message')
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.text()).toBe('Email is required')
    })

    it('should accept valid email format', async () => {
      const wrapper = mount(SignupForm)
      const emailInput = wrapper.find('input[id="signup-email"]')

      await emailInput.setValue('test@example.com')
      await emailInput.trigger('blur')
      await wrapper.vm.$nextTick()

      // Should not show email error
      const errorMessages = wrapper.findAll('.error-message')
      const emailError = errorMessages.find((el) => el.text().includes('email'))
      expect(emailError).toBeFalsy()
    })
  })

  describe('Password Validation', () => {
    it('should validate password security requirements', async () => {
      const wrapper = mount(SignupForm)
      const passwordInput = wrapper.find('input[id="signup-password"]')

      // Test weak password
      await passwordInput.setValue('weak')
      await passwordInput.trigger('blur')
      await wrapper.vm.$nextTick()

      const errorMessage = wrapper.find('.error-message')
      expect(errorMessage.exists()).toBe(true)
      expect(errorMessage.text()).toBe('Password does not meet security requirements')
    })

    it('should update password requirement indicators', async () => {
      const wrapper = mount(SignupForm)
      const passwordInput = wrapper.find('input[id="signup-password"]')

      // Initially all requirements should be invalid
      let requirements = wrapper.findAll('.password-requirements li')
      requirements.forEach((req) => {
        expect(req.classes()).not.toContain('valid')
      })

      // Test password that meets length requirement
      await passwordInput.setValue('12345678')
      await wrapper.vm.$nextTick()

      requirements = wrapper.findAll('.password-requirements li')
      expect(requirements[0].classes()).toContain('valid') // Length requirement

      // Test password that meets all requirements
      await passwordInput.setValue('Password123')
      await wrapper.vm.$nextTick()

      requirements = wrapper.findAll('.password-requirements li')
      requirements.forEach((req) => {
        expect(req.classes()).toContain('valid')
      })
    })

    it('should validate individual password requirements', async () => {
      const wrapper = mount(SignupForm)
      const passwordInput = wrapper.find('input[id="signup-password"]')

      const testCases = [
        { password: '1234567', expectedValid: [false, false, false, true] }, // Only number
        { password: 'abcdefgh', expectedValid: [true, false, true, false] }, // Only lowercase
        { password: 'ABCDEFGH', expectedValid: [true, true, false, false] }, // Only uppercase
        { password: 'Abc123', expectedValid: [false, true, true, true] }, // Missing length
        { password: 'Password123', expectedValid: [true, true, true, true] }, // All valid
      ]

      for (const testCase of testCases) {
        await passwordInput.setValue(testCase.password)
        await wrapper.vm.$nextTick()

        const requirements = wrapper.findAll('.password-requirements li')
        testCase.expectedValid.forEach((shouldBeValid, index) => {
          if (shouldBeValid) {
            expect(requirements[index].classes()).toContain('valid')
          } else {
            expect(requirements[index].classes()).not.toContain('valid')
          }
        })
      }
    })
  })

  describe('Password Confirmation Validation', () => {
    it('should validate password confirmation matches', async () => {
      const wrapper = mount(SignupForm)
      const passwordInput = wrapper.find('input[id="signup-password"]')
      const confirmInput = wrapper.find('input[id="confirm-password"]')

      await passwordInput.setValue('Password123')
      await confirmInput.setValue('DifferentPassword')
      await confirmInput.trigger('blur')
      await wrapper.vm.$nextTick()

      const errorMessages = wrapper.findAll('.error-message')
      const confirmError = errorMessages.find((el) => el.text() === 'Passwords do not match')
      expect(confirmError).toBeTruthy()
    })

    it('should validate required confirmation field', async () => {
      const wrapper = mount(SignupForm)
      const confirmInput = wrapper.find('input[id="confirm-password"]')

      await confirmInput.setValue('')
      await confirmInput.trigger('blur')
      await wrapper.vm.$nextTick()

      const errorMessages = wrapper.findAll('.error-message')
      const confirmError = errorMessages.find((el) => el.text() === 'Please confirm your password')
      expect(confirmError).toBeTruthy()
    })

    it('should accept matching passwords', async () => {
      const wrapper = mount(SignupForm)
      const passwordInput = wrapper.find('input[id="signup-password"]')
      const confirmInput = wrapper.find('input[id="confirm-password"]')

      const password = 'Password123'
      await passwordInput.setValue(password)
      await confirmInput.setValue(password)
      await confirmInput.trigger('blur')
      await wrapper.vm.$nextTick()

      // Should not show confirmation error
      const errorMessages = wrapper.findAll('.error-message')
      const confirmError = errorMessages.find((el) => el.text().includes('match'))
      expect(confirmError).toBeFalsy()
    })

    it('should re-validate confirmation when password changes', async () => {
      const wrapper = mount(SignupForm)
      const passwordInput = wrapper.find('input[id="signup-password"]')
      const confirmInput = wrapper.find('input[id="confirm-password"]')

      // Set matching passwords
      await passwordInput.setValue('Password123')
      await confirmInput.setValue('Password123')
      await confirmInput.trigger('blur')
      await wrapper.vm.$nextTick()

      // Change password to make them not match
      await passwordInput.setValue('NewPassword123')
      await passwordInput.trigger('blur')
      await wrapper.vm.$nextTick()

      const errorMessages = wrapper.findAll('.error-message')
      const confirmError = errorMessages.find((el) => el.text() === 'Passwords do not match')
      expect(confirmError).toBeTruthy()
    })
  })

  describe('Form Submission', () => {
    it('should disable submit button when form is invalid', async () => {
      const wrapper = mount(SignupForm)
      const submitButton = wrapper.find('button[type="submit"]')

      // Initially disabled with empty form
      expect(submitButton.attributes('disabled')).toBeDefined()

      // Fill in valid data step by step
      const emailInput = wrapper.find('input[id="signup-email"]')
      await emailInput.setValue('test@example.com')
      await wrapper.vm.$nextTick()
      expect(submitButton.attributes('disabled')).toBeDefined()

      const passwordInput = wrapper.find('input[id="signup-password"]')
      await passwordInput.setValue('Password123')
      await wrapper.vm.$nextTick()
      expect(submitButton.attributes('disabled')).toBeDefined()

      const confirmInput = wrapper.find('input[id="confirm-password"]')
      await confirmInput.setValue('Password123')
      await wrapper.vm.$nextTick()
      expect(submitButton.attributes('disabled')).toBeUndefined()
    })

    it('should show loading state during submission', async () => {
      const wrapper = mount(SignupForm)
      const submitButton = wrapper.find('button[type="submit"]')

      // Set loading state using exposed method
      wrapper.vm.setLoading(true)
      await wrapper.vm.$nextTick()

      expect(submitButton.text()).toBe('Creating Account...')
      expect(submitButton.attributes('disabled')).toBeDefined()
    })

    it('should not submit when form is invalid', async () => {
      const wrapper = mount(SignupForm)
      const form = wrapper.find('form')

      // Try to submit empty form
      await form.trigger('submit')
      await wrapper.vm.$nextTick()

      // Should show validation errors instead of submitting
      const errorMessages = wrapper.findAll('.error-message')
      expect(errorMessages.length).toBeGreaterThan(0)
    })

    it('should validate all fields on submit attempt', async () => {
      const wrapper = mount(SignupForm)
      const form = wrapper.find('form')

      await form.trigger('submit')
      await wrapper.vm.$nextTick()

      // Should show multiple validation errors
      const errorMessages = wrapper.findAll('.error-message')
      expect(errorMessages.length).toBeGreaterThanOrEqual(3) // Email, password, confirm password
    })
  })

  describe('Error Handling', () => {
    it('should display general error messages', async () => {
      const wrapper = mount(SignupForm)
      const errorMessage = 'Registration failed'

      // Set error using exposed method
      wrapper.vm.setError(errorMessage)
      await wrapper.vm.$nextTick()

      const generalError = wrapper.find('.general-error')
      expect(generalError.exists()).toBe(true)
      expect(generalError.text()).toBe(errorMessage)
    })

    it('should clear loading state when error is set', async () => {
      const wrapper = mount(SignupForm)

      // Set loading state first
      wrapper.vm.setLoading(true)
      await wrapper.vm.$nextTick()

      const submitButton = wrapper.find('button[type="submit"]')
      expect(submitButton.text()).toBe('Creating Account...')

      // Set error (should clear loading)
      wrapper.vm.setError('Test error')
      await wrapper.vm.$nextTick()

      expect(submitButton.text()).toBe('Create Account')
    })
  })

  describe('User Interactions', () => {
    it('should emit toggle event when login link is clicked', async () => {
      const wrapper = mount(SignupForm)
      const toggleButton = wrapper.find('.toggle-button')

      await toggleButton.trigger('click')

      expect(wrapper.emitted('toggle')).toBeTruthy()
      expect(wrapper.emitted('toggle')).toHaveLength(1)
    })

    it('should clear errors when user starts typing', async () => {
      const wrapper = mount(SignupForm)
      const emailInput = wrapper.find('input[id="signup-email"]')

      // Generate error
      await emailInput.setValue('invalid-email')
      await emailInput.trigger('blur')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.error-message').exists()).toBe(true)

      // Clear error by typing
      await emailInput.trigger('input')
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.error-message').exists()).toBe(false)
    })

    it('should apply error styling to invalid fields', async () => {
      const wrapper = mount(SignupForm)
      const emailInput = wrapper.find('input[id="signup-email"]')

      await emailInput.setValue('invalid-email')
      await emailInput.trigger('blur')
      await wrapper.vm.$nextTick()

      expect(emailInput.classes()).toContain('error')
    })
  })

  describe('Password Security Requirements', () => {
    it('should enforce minimum password length', async () => {
      const wrapper = mount(SignupForm)
      const passwordInput = wrapper.find('input[id="signup-password"]')

      await passwordInput.setValue('Short1')
      await wrapper.vm.$nextTick()

      const lengthRequirement = wrapper.findAll('.password-requirements li')[0]
      expect(lengthRequirement.classes()).not.toContain('valid')
    })

    it('should require uppercase letter', async () => {
      const wrapper = mount(SignupForm)
      const passwordInput = wrapper.find('input[id="signup-password"]')

      await passwordInput.setValue('lowercase123')
      await wrapper.vm.$nextTick()

      const uppercaseRequirement = wrapper.findAll('.password-requirements li')[1]
      expect(uppercaseRequirement.classes()).not.toContain('valid')
    })

    it('should require lowercase letter', async () => {
      const wrapper = mount(SignupForm)
      const passwordInput = wrapper.find('input[id="signup-password"]')

      await passwordInput.setValue('UPPERCASE123')
      await wrapper.vm.$nextTick()

      const lowercaseRequirement = wrapper.findAll('.password-requirements li')[2]
      expect(lowercaseRequirement.classes()).not.toContain('valid')
    })

    it('should require number', async () => {
      const wrapper = mount(SignupForm)
      const passwordInput = wrapper.find('input[id="signup-password"]')

      await passwordInput.setValue('NoNumbers')
      await wrapper.vm.$nextTick()

      const numberRequirement = wrapper.findAll('.password-requirements li')[3]
      expect(numberRequirement.classes()).not.toContain('valid')
    })

    it('should accept password meeting all requirements', async () => {
      const wrapper = mount(SignupForm)
      const passwordInput = wrapper.find('input[id="signup-password"]')

      await passwordInput.setValue('ValidPassword123')
      await wrapper.vm.$nextTick()

      const requirements = wrapper.findAll('.password-requirements li')
      requirements.forEach((req) => {
        expect(req.classes()).toContain('valid')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels and IDs', () => {
      const wrapper = mount(SignupForm)

      const emailInput = wrapper.find('input[id="signup-email"]')
      const passwordInput = wrapper.find('input[id="signup-password"]')
      const confirmInput = wrapper.find('input[id="confirm-password"]')

      expect(emailInput.attributes('id')).toBe('signup-email')
      expect(passwordInput.attributes('id')).toBe('signup-password')
      expect(confirmInput.attributes('id')).toBe('confirm-password')

      // Check labels are properly associated
      expect(wrapper.find('label[for="signup-email"]').exists()).toBe(true)
      expect(wrapper.find('label[for="signup-password"]').exists()).toBe(true)
      expect(wrapper.find('label[for="confirm-password"]').exists()).toBe(true)
    })

    it('should have required attributes on form fields', () => {
      const wrapper = mount(SignupForm)

      const emailInput = wrapper.find('input[id="signup-email"]')
      const passwordInput = wrapper.find('input[id="signup-password"]')
      const confirmInput = wrapper.find('input[id="confirm-password"]')

      expect(emailInput.attributes('required')).toBeDefined()
      expect(passwordInput.attributes('required')).toBeDefined()
      expect(confirmInput.attributes('required')).toBeDefined()
    })
  })
})
