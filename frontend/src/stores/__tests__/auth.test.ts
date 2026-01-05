import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../auth'
import * as apiService from '../../services/api'
import type { AuthResponse, User } from '../../types/api'

// Mock the API service
vi.mock('../../services/api')

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

// Mock setTimeout and clearTimeout for token expiration tests
vi.mock('timers')

describe('Auth Store', () => {
  let authStore: ReturnType<typeof useAuthStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    authStore = useAuthStore()
    vi.clearAllMocks()

    // Reset localStorage mock
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockImplementation(() => {})
    localStorageMock.removeItem.mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(authStore.user).toBeNull()
      expect(authStore.token).toBeNull()
      expect(authStore.isLoading).toBe(false)
      expect(authStore.lastError).toBeNull()
      expect(authStore.isAuthenticated).toBe(false)
    })
  })

  describe('Authentication State Management', () => {
    it('should update isAuthenticated when user and token are set', () => {
      const mockUser: User = {
        id: 1,
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }
      const mockToken = 'mock-jwt-token'

      // Initially not authenticated
      expect(authStore.isAuthenticated).toBe(false)

      // Set user and token (simulating successful login)
      authStore.$patch({
        user: mockUser,
        token: mockToken,
      })

      expect(authStore.isAuthenticated).toBe(true)
    })

    it('should be false when only user is set without token', () => {
      const mockUser: User = {
        id: 1,
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      authStore.$patch({ user: mockUser })
      expect(authStore.isAuthenticated).toBe(false)
    })

    it('should be false when only token is set without user', () => {
      authStore.$patch({ token: 'mock-token' })
      expect(authStore.isAuthenticated).toBe(false)
    })
  })

  describe('Registration', () => {
    it('should register user successfully', async () => {
      const registerData = {
        email: 'newuser@example.com',
        password: 'Password123',
      }

      const mockResponse: AuthResponse = {
        user: {
          id: 1,
          email: 'newuser@example.com',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        token: 'mock-jwt-token',
      }

      vi.mocked(apiService.register).mockResolvedValue({
        success: true,
        data: mockResponse,
      })

      const result = await authStore.register(registerData)

      expect(result.success).toBe(true)
      expect(authStore.user).toEqual(mockResponse.user)
      expect(authStore.token).toBe(mockResponse.token)
      expect(authStore.isAuthenticated).toBe(true)
      expect(authStore.lastError).toBeNull()
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', mockResponse.token)
    })

    it('should handle registration failure', async () => {
      const registerData = {
        email: 'existing@example.com',
        password: 'Password123',
      }

      const errorMessage = 'Email already exists'
      vi.mocked(apiService.register).mockResolvedValue({
        success: false,
        error: {
          error: 'email_exists',
          message: errorMessage,
        },
      })

      const result = await authStore.register(registerData)

      expect(result.success).toBe(false)
      expect(authStore.user).toBeNull()
      expect(authStore.token).toBeNull()
      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.lastError).toBe(errorMessage)
    })

    it('should handle registration exception', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'Password123',
      }

      vi.mocked(apiService.register).mockRejectedValue(new Error('Network error'))

      const result = await authStore.register(registerData)

      expect(result.success).toBe(false)
      expect(authStore.user).toBeNull()
      expect(authStore.token).toBeNull()
      expect(authStore.lastError).toBe('An unexpected error occurred during registration')
    })

    it('should set loading state during registration', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'Password123',
      }

      let resolveRegister: (value: any) => void
      const registerPromise = new Promise((resolve) => {
        resolveRegister = resolve
      })
      vi.mocked(apiService.register).mockReturnValue(registerPromise)

      // Start registration
      const resultPromise = authStore.register(registerData)

      // Should be loading
      expect(authStore.isLoading).toBe(true)

      // Resolve registration
      resolveRegister!({ success: true, data: { user: {}, token: 'token' } })
      await resultPromise

      // Should not be loading anymore
      expect(authStore.isLoading).toBe(false)
    })
  })

  describe('Login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      }

      const mockResponse: AuthResponse = {
        user: {
          id: 1,
          email: 'test@example.com',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        token: 'mock-jwt-token',
      }

      vi.mocked(apiService.login).mockResolvedValue({
        success: true,
        data: mockResponse,
      })

      const result = await authStore.login(loginData)

      expect(result.success).toBe(true)
      expect(authStore.user).toEqual(mockResponse.user)
      expect(authStore.token).toBe(mockResponse.token)
      expect(authStore.isAuthenticated).toBe(true)
      expect(authStore.lastError).toBeNull()
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', mockResponse.token)
    })

    it('should handle login failure', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      }

      const errorMessage = 'Invalid credentials'
      vi.mocked(apiService.login).mockResolvedValue({
        success: false,
        error: {
          error: 'invalid_credentials',
          message: errorMessage,
        },
      })

      const result = await authStore.login(loginData)

      expect(result.success).toBe(false)
      expect(authStore.user).toBeNull()
      expect(authStore.token).toBeNull()
      expect(authStore.isAuthenticated).toBe(false)
      expect(authStore.lastError).toBe(errorMessage)
    })

    it('should handle login exception', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      }

      vi.mocked(apiService.login).mockRejectedValue(new Error('Network error'))

      const result = await authStore.login(loginData)

      expect(result.success).toBe(false)
      expect(authStore.user).toBeNull()
      expect(authStore.token).toBeNull()
      expect(authStore.lastError).toBe('An unexpected error occurred during login')
    })
  })

  describe('Logout', () => {
    it('should clear user data and token on logout', () => {
      // Set up authenticated state
      authStore.$patch({
        user: {
          id: 1,
          email: 'test@example.com',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        token: 'mock-token',
        lastError: 'Some error',
      })

      expect(authStore.isAuthenticated).toBe(true)

      // Logout
      authStore.logout()

      expect(authStore.user).toBeNull()
      expect(authStore.token).toBeNull()
      expect(authStore.lastError).toBeNull()
      expect(authStore.isAuthenticated).toBe(false)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token')
    })
  })

  describe('Initialize Authentication', () => {
    it('should initialize auth from localStorage token', async () => {
      const mockToken = 'stored-token'
      const mockUser: User = {
        id: 1,
        email: 'test@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      localStorageMock.getItem.mockReturnValue(mockToken)
      vi.mocked(apiService.getCurrentUser).mockResolvedValue({
        success: true,
        data: { user: mockUser, organizations: [] },
      })

      await authStore.initializeAuth()

      expect(authStore.token).toBe(mockToken)
      expect(authStore.user).toEqual(mockUser)
      expect(authStore.isAuthenticated).toBe(true)
    })

    it('should logout if stored token is invalid', async () => {
      const mockToken = 'invalid-token'
      localStorageMock.getItem.mockReturnValue(mockToken)
      vi.mocked(apiService.getCurrentUser).mockResolvedValue({
        success: false,
        error: { error: 'invalid_token', message: 'Token expired' },
      })

      await authStore.initializeAuth()

      expect(authStore.user).toBeNull()
      expect(authStore.token).toBeNull()
      expect(authStore.isAuthenticated).toBe(false)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token')
    })

    it('should handle initialization when no token exists', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      await authStore.initializeAuth()

      expect(authStore.user).toBeNull()
      expect(authStore.token).toBeNull()
      expect(authStore.isAuthenticated).toBe(false)
      expect(apiService.getCurrentUser).not.toHaveBeenCalled()
    })
  })

  describe('Refresh User', () => {
    it('should refresh user data successfully', async () => {
      const mockUser: User = {
        id: 1,
        email: 'updated@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }

      // Set initial auth state
      authStore.$patch({ token: 'valid-token' })

      vi.mocked(apiService.getCurrentUser).mockResolvedValue({
        success: true,
        data: { user: mockUser, organizations: [] },
      })

      const result = await authStore.refreshUser()

      expect(result).toBe(true)
      expect(authStore.user).toEqual(mockUser)
      expect(authStore.lastError).toBeNull()
    })

    it('should logout if refresh fails', async () => {
      authStore.$patch({
        token: 'invalid-token',
        user: { id: 1, email: 'test@example.com', created_at: '', updated_at: '' },
      })

      vi.mocked(apiService.getCurrentUser).mockResolvedValue({
        success: false,
        error: { error: 'unauthorized', message: 'Token expired' },
      })

      const result = await authStore.refreshUser()

      expect(result).toBe(false)
      expect(authStore.user).toBeNull()
      expect(authStore.token).toBeNull()
      expect(authStore.isAuthenticated).toBe(false)
    })

    it('should return false if no token exists', async () => {
      const result = await authStore.refreshUser()

      expect(result).toBe(false)
      expect(apiService.getCurrentUser).not.toHaveBeenCalled()
    })
  })

  describe('Token Expiration', () => {
    it('should logout when token is expired', () => {
      // Mock a JWT token with expired timestamp
      const expiredPayload = {
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      }
      const expiredToken = `header.${btoa(JSON.stringify(expiredPayload))}.signature`

      authStore.$patch({
        token: expiredToken,
        user: { id: 1, email: 'test@example.com', created_at: '', updated_at: '' },
      })

      authStore.checkTokenExpiration()

      expect(authStore.user).toBeNull()
      expect(authStore.token).toBeNull()
      expect(authStore.lastError).toBe('Your session has expired. Please log in again.')
    })

    it('should not logout when token is valid', () => {
      // Mock a JWT token with future timestamp
      const validPayload = {
        exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
      }
      const validToken = `header.${btoa(JSON.stringify(validPayload))}.signature`

      authStore.$patch({
        token: validToken,
        user: { id: 1, email: 'test@example.com', created_at: '', updated_at: '' },
      })

      authStore.checkTokenExpiration()

      expect(authStore.user).not.toBeNull()
      expect(authStore.token).toBe(validToken)
      expect(authStore.lastError).toBeNull()
    })

    it('should logout when token format is invalid', () => {
      authStore.$patch({
        token: 'invalid-token-format',
        user: { id: 1, email: 'test@example.com', created_at: '', updated_at: '' },
      })

      authStore.checkTokenExpiration()

      expect(authStore.user).toBeNull()
      expect(authStore.token).toBeNull()
    })

    it('should handle malformed JWT payload', () => {
      const malformedToken = 'header.invalid-base64.signature'

      authStore.$patch({
        token: malformedToken,
        user: { id: 1, email: 'test@example.com', created_at: '', updated_at: '' },
      })

      authStore.checkTokenExpiration()

      expect(authStore.user).toBeNull()
      expect(authStore.token).toBeNull()
    })
  })

  describe('Error Management', () => {
    it('should clear errors', () => {
      authStore.$patch({ lastError: 'Some error' })
      expect(authStore.lastError).toBe('Some error')

      authStore.clearError()
      expect(authStore.lastError).toBeNull()
    })

    it('should handle API errors without messages', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      }

      vi.mocked(apiService.login).mockResolvedValue({
        success: false,
        error: { error: 'unknown_error' },
        // No message property
      })

      const result = await authStore.login(loginData)

      expect(result.success).toBe(false)
      expect(authStore.lastError).toBe('Login failed')
    })
  })

  describe('Loading States', () => {
    it('should manage loading state correctly during operations', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      }

      let resolveLogin: (value: any) => void
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve
      })
      vi.mocked(apiService.login).mockReturnValue(loginPromise)

      // Start login
      const resultPromise = authStore.login(loginData)
      expect(authStore.isLoading).toBe(true)

      // Resolve login
      resolveLogin!({ success: true, data: { user: {}, token: 'token' } })
      await resultPromise

      expect(authStore.isLoading).toBe(false)
    })

    it('should clear loading state on error', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      }

      vi.mocked(apiService.login).mockRejectedValue(new Error('Network error'))

      await authStore.login(loginData)

      expect(authStore.isLoading).toBe(false)
    })
  })
})
