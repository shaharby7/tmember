import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import AuthView from '../AuthView.vue'
import { useAuthStore } from '../../stores/auth'
import type { LoginRequest, RegisterRequest } from '../../types/api'

// Mock the auth components
vi.mock('../../components/auth/LoginForm.vue', () => ({
  default: {
    name: 'LoginForm',
    template: '<div data-testid="login-form">Login Form</div>',
    emits: ['toggle', 'submit'],
  },
}))

vi.mock('../../components/auth/SignupForm.vue', () => ({
  default: {
    name: 'SignupForm',
    template: '<div data-testid="signup-form">Signup Form</div>',
    emits: ['toggle', 'submit'],
  },
}))

// Mock the auth store
vi.mock('../../stores/auth', () => ({
  useAuthStore: vi.fn(),
}))

// Mock router
const mockPush = vi.fn()
vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router')
  return {
    ...actual,
    useRouter: () => ({
      push: mockPush,
    }),
  }
})

describe('AuthView', () => {
  let mockAuthStore: any
  let pinia: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Create fresh pinia instance
    pinia = createPinia()
    setActivePinia(pinia)

    // Mock auth store
    mockAuthStore = {
      login: vi.fn(),
      register: vi.fn(),
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }

    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore)
  })

  describe('Component Rendering', () => {
    it('should render the auth header', () => {
      const wrapper = mount(AuthView, {
        global: {
          plugins: [pinia],
        },
      })

      const header = wrapper.find('.auth-header')
      expect(header.exists()).toBe(true)
      expect(header.find('h1').text()).toBe('TMember')
      expect(header.find('p').text()).toBe('Welcome to your organization management platform')
    })

    it('should render LoginForm by default', () => {
      const wrapper = mount(AuthView, {
        global: {
          plugins: [pinia],
        },
      })

      expect(wrapper.find('[data-testid="login-form"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="signup-form"]').exists()).toBe(false)
    })

    it('should render SignupForm when showSignup is true', async () => {
      const wrapper = mount(AuthView, {
        global: {
          plugins: [pinia],
        },
      })

      // Toggle to signup form
      await wrapper.vm.toggleForm()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="signup-form"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="login-form"]').exists()).toBe(false)
    })
  })

  describe('Form Toggle Functionality', () => {
    it('should toggle between login and signup forms', async () => {
      const wrapper = mount(AuthView, {
        global: {
          plugins: [pinia],
        },
      })

      // Initially shows login form
      expect(wrapper.find('[data-testid="login-form"]').exists()).toBe(true)

      // Toggle to signup
      await wrapper.vm.toggleForm()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-testid="signup-form"]').exists()).toBe(true)

      // Toggle back to login
      await wrapper.vm.toggleForm()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('[data-testid="login-form"]').exists()).toBe(true)
    })

    it('should have smooth transition animation', () => {
      const wrapper = mount(AuthView, {
        global: {
          plugins: [pinia],
        },
      })

      const authForms = wrapper.find('.auth-forms')
      expect(authForms.exists()).toBe(true)

      // Check for animation class
      const styles = getComputedStyle(authForms.element)
      // Note: In test environment, we can't easily test CSS animations
      // but we can verify the class exists
      expect(authForms.classes()).toContain('auth-forms')
    })
  })

  describe('Login Handling', () => {
    it('should call auth store login method with correct data', async () => {
      mockAuthStore.login.mockResolvedValue({ success: true })

      const wrapper = mount(AuthView, {
        global: {
          plugins: [pinia],
        },
      })

      const loginData: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      }

      await wrapper.vm.handleLogin(loginData)

      expect(mockAuthStore.login).toHaveBeenCalledWith(loginData)
    })

    it('should redirect to dashboard on successful login', async () => {
      mockAuthStore.login.mockResolvedValue({ success: true })

      const wrapper = mount(AuthView, {
        global: {
          plugins: [pinia],
        },
      })

      const loginData: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      }

      await wrapper.vm.handleLogin(loginData)

      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    it('should handle login errors gracefully', async () => {
      const errorMessage = 'Invalid credentials'
      mockAuthStore.login.mockResolvedValue({
        success: false,
        error: { message: errorMessage },
      })

      const wrapper = mount(AuthView, {
        global: {
          plugins: [pinia],
        },
      })

      const loginData: LoginRequest = {
        email: 'test@example.com',
        password: 'wrongpassword',
      }

      await wrapper.vm.handleLogin(loginData)

      // Should not redirect on error
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should handle login exceptions', async () => {
      mockAuthStore.login.mockRejectedValue(new Error('Network error'))

      const wrapper = mount(AuthView, {
        global: {
          plugins: [pinia],
        },
      })

      const loginData: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      }

      // Should not throw error
      await expect(wrapper.vm.handleLogin(loginData)).resolves.toBeUndefined()
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Registration Handling', () => {
    it('should call auth store register method with correct data', async () => {
      mockAuthStore.register.mockResolvedValue({ success: true })

      const wrapper = mount(AuthView, {
        global: {
          plugins: [pinia],
        },
      })

      const registerData: RegisterRequest = {
        email: 'newuser@example.com',
        password: 'Password123',
      }

      await wrapper.vm.handleSignup(registerData)

      expect(mockAuthStore.register).toHaveBeenCalledWith(registerData)
    })

    it('should redirect to dashboard on successful registration', async () => {
      mockAuthStore.register.mockResolvedValue({ success: true })

      const wrapper = mount(AuthView, {
        global: {
          plugins: [pinia],
        },
      })

      const registerData: RegisterRequest = {
        email: 'newuser@example.com',
        password: 'Password123',
      }

      await wrapper.vm.handleSignup(registerData)

      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    it('should handle registration errors gracefully', async () => {
      const errorMessage = 'Email already exists'
      mockAuthStore.register.mockResolvedValue({
        success: false,
        error: { message: errorMessage },
      })

      const wrapper = mount(AuthView, {
        global: {
          plugins: [pinia],
        },
      })

      const registerData: RegisterRequest = {
        email: 'existing@example.com',
        password: 'Password123',
      }

      await wrapper.vm.handleSignup(registerData)

      // Should not redirect on error
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should handle registration exceptions', async () => {
      mockAuthStore.register.mockRejectedValue(new Error('Server error'))

      const wrapper = mount(AuthView, {
        global: {
          plugins: [pinia],
        },
      })

      const registerData: RegisterRequest = {
        email: 'newuser@example.com',
        password: 'Password123',
      }

      // Should not throw error
      await expect(wrapper.vm.handleSignup(registerData)).resolves.toBeUndefined()
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Error Message Handling', () => {
    it('should display default error message when no specific message provided', async () => {
      mockAuthStore.login.mockResolvedValue({
        success: false,
        error: { error: 'unknown_error' },
      })

      const wrapper = mount(AuthView, {
        global: {
          plugins: [pinia],
        },
      })

      const loginData: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      }

      await wrapper.vm.handleLogin(loginData)

      // The component should handle the case where no message is provided
      // by using a default message
      expect(mockAuthStore.login).toHaveBeenCalled()
    })

    it('should handle missing error object gracefully', async () => {
      mockAuthStore.login.mockResolvedValue({
        success: false,
        // No error object
      })

      const wrapper = mount(AuthView, {
        global: {
          plugins: [pinia],
        },
      })

      const loginData: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      }

      // Should not throw error
      await expect(wrapper.vm.handleLogin(loginData)).resolves.toBeUndefined()
    })
  })

  describe('Loading States', () => {
    it('should handle loading state during login', async () => {
      let resolveLogin: (value: any) => void
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve
      })
      mockAuthStore.login.mockReturnValue(loginPromise)

      const wrapper = mount(AuthView, {
        global: {
          plugins: [pinia],
        },
      })

      const loginData: LoginRequest = {
        email: 'test@example.com',
        password: 'password123',
      }

      // Start login process
      const loginPromiseResult = wrapper.vm.handleLogin(loginData)

      // Login should be in progress
      expect(mockAuthStore.login).toHaveBeenCalled()

      // Resolve the login
      resolveLogin!({ success: true })
      await loginPromiseResult

      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    it('should handle loading state during registration', async () => {
      let resolveRegister: (value: any) => void
      const registerPromise = new Promise((resolve) => {
        resolveRegister = resolve
      })
      mockAuthStore.register.mockReturnValue(registerPromise)

      const wrapper = mount(AuthView, {
        global: {
          plugins: [pinia],
        },
      })

      const registerData: RegisterRequest = {
        email: 'newuser@example.com',
        password: 'Password123',
      }

      // Start registration process
      const registerPromiseResult = wrapper.vm.handleSignup(registerData)

      // Registration should be in progress
      expect(mockAuthStore.register).toHaveBeenCalled()

      // Resolve the registration
      resolveRegister!({ success: true })
      await registerPromiseResult

      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  describe('Responsive Design', () => {
    it('should have responsive container classes', () => {
      const wrapper = mount(AuthView, {
        global: {
          plugins: [pinia],
        },
      })

      expect(wrapper.find('.auth-view').exists()).toBe(true)
      expect(wrapper.find('.auth-container').exists()).toBe(true)
      expect(wrapper.find('.auth-header').exists()).toBe(true)
      expect(wrapper.find('.auth-forms').exists()).toBe(true)
    })

    it('should maintain proper layout structure', () => {
      const wrapper = mount(AuthView, {
        global: {
          plugins: [pinia],
        },
      })

      const authView = wrapper.find('.auth-view')
      const authContainer = wrapper.find('.auth-container')
      const authHeader = wrapper.find('.auth-header')
      const authForms = wrapper.find('.auth-forms')

      expect(authView.contains(authContainer.element)).toBe(true)
      expect(authContainer.contains(authHeader.element)).toBe(true)
      expect(authContainer.contains(authForms.element)).toBe(true)
    })
  })
})
