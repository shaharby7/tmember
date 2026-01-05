import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  apiClient,
  register as apiRegister,
  login as apiLogin,
  getCurrentUser,
} from '../services/api'
import type { User, LoginRequest, RegisterRequest, ApiResponse, AuthResponse } from '../types/api'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const isLoading = ref(false)
  const lastError = ref<string | null>(null)
  const isInitialized = ref(false)

  // Computed
  const isAuthenticated = computed(() => {
    return user.value !== null && token.value !== null
  })

  // Actions
  const setUser = (userData: User | null) => {
    user.value = userData
  }

  const setToken = (tokenValue: string | null) => {
    token.value = tokenValue
    // Let the API client handle localStorage persistence
    apiClient.setAuthToken(tokenValue)
  }

  const setError = (error: string | null) => {
    lastError.value = error
  }

  const clearError = () => {
    lastError.value = null
  }

  /**
   * Initialize authentication state from localStorage
   */
  const initializeAuth = async () => {
    // Prevent multiple initialization attempts
    if (isInitialized.value) {
      return
    }

    const storedToken = localStorage.getItem('auth_token')

    if (storedToken) {
      // Basic token validation - check if it's a valid JWT structure
      try {
        const tokenParts = storedToken.split('.')
        if (tokenParts.length === 3 && tokenParts[1]) {
          // Decode the payload to get user info
          const payload = JSON.parse(atob(tokenParts[1]))
          const currentTime = Math.floor(Date.now() / 1000)

          // Check if token is not expired
          if (payload.exp && payload.exp > currentTime) {
            // Token is valid, set it and create a user object from the payload
            setToken(storedToken)
            setUser({
              id: payload.user_id,
              email: payload.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            clearError()
          } else {
            // Token expired, clear auth state
            logout()
          }
        } else {
          // Invalid token format, clear auth state
          logout()
        }
      } catch (error) {
        // Token validation failed, clear auth state
        logout()
      }
    }

    isInitialized.value = true
  }

  /**
   * Register a new user
   */
  const register = async (registerData: RegisterRequest): Promise<ApiResponse<AuthResponse>> => {
    try {
      isLoading.value = true
      clearError()

      const result = await apiRegister(registerData)

      if (result.success && result.data) {
        // Store user and token
        setUser(result.data.user)
        setToken(result.data.token)

        return result
      } else {
        setError(result.error?.message || 'Registration failed')
        return result
      }
    } catch (error) {
      const errorMessage = 'An unexpected error occurred during registration'
      setError(errorMessage)
      return {
        success: false,
        error: {
          error: 'unknown_error',
          message: errorMessage,
        },
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Login user
   */
  const login = async (loginData: LoginRequest): Promise<ApiResponse<AuthResponse>> => {
    try {
      isLoading.value = true
      clearError()

      const result = await apiLogin(loginData)

      if (result.success && result.data) {
        // Store user and token
        setUser(result.data.user)
        setToken(result.data.token)

        return result
      } else {
        setError(result.error?.message || 'Login failed')
        return result
      }
    } catch (error) {
      const errorMessage = 'An unexpected error occurred during login'
      setError(errorMessage)
      return {
        success: false,
        error: {
          error: 'unknown_error',
          message: errorMessage,
        },
      }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Logout user
   */
  const logout = () => {
    setUser(null)
    setToken(null) // This will call apiClient.setAuthToken(null) which removes from localStorage
    clearError()

    // Clear organization-related data from localStorage
    localStorage.removeItem('current_organization')

    // Reset initialization flag
    isInitialized.value = false
  }

  /**
   * Refresh user data
   */
  const refreshUser = async (): Promise<boolean> => {
    if (!token.value) {
      return false
    }

    try {
      isLoading.value = true
      const result = await getCurrentUser()

      if (result.success && result.data) {
        setUser(result.data.user)
        clearError()
        return true
      } else {
        // If refresh fails, logout user
        logout()
        return false
      }
    } catch (error) {
      logout()
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Check if token is expired and handle session expiration
   */
  const checkTokenExpiration = () => {
    if (!token.value) {
      return
    }

    try {
      // JWT tokens have 3 parts separated by dots
      const tokenParts = token.value.split('.')
      if (tokenParts.length !== 3) {
        logout()
        return
      }

      // Decode the payload (second part)
      const payloadPart = tokenParts[1]
      if (!payloadPart) {
        logout()
        return
      }

      const payload = JSON.parse(atob(payloadPart))
      const currentTime = Math.floor(Date.now() / 1000)

      // Check if token is expired (exp claim)
      if (payload.exp && payload.exp < currentTime) {
        logout()
        setError('Your session has expired. Please log in again.')
      }
    } catch (error) {
      // If we can't decode the token, it's invalid
      logout()
    }
  }

  // Set up periodic token expiration check
  let tokenCheckInterval: number | null = null

  const startTokenExpirationCheck = () => {
    // Check every 5 minutes
    tokenCheckInterval = window.setInterval(checkTokenExpiration, 5 * 60 * 1000)
  }

  const stopTokenExpirationCheck = () => {
    if (tokenCheckInterval) {
      clearInterval(tokenCheckInterval)
      tokenCheckInterval = null
    }
  }

  // Start checking when store is created
  startTokenExpirationCheck()

  return {
    // State
    user: computed(() => user.value),
    token: computed(() => token.value),
    isLoading: computed(() => isLoading.value),
    lastError: computed(() => lastError.value),
    isInitialized: computed(() => isInitialized.value),
    isAuthenticated,

    // Actions
    initializeAuth,
    register,
    login,
    logout,
    refreshUser,
    clearError,
    checkTokenExpiration,
    startTokenExpirationCheck,
    stopTokenExpirationCheck,
  }
})
