import type {
  HealthResponse,
  ErrorResponse,
  ApiResponse,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
  Organization,
} from '../types/api'

// Base API configuration
const API_BASE_URL = '/api' // Proxied through Vite dev server
const DEFAULT_TIMEOUT = 10000 // 10 seconds

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorResponse?: ErrorResponse,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// HTTP client class for API communication
class ApiClient {
  private baseUrl: string
  private timeout: number
  private authToken: string | null = null
  private currentOrganizationId: number | null = null

  constructor(baseUrl: string = API_BASE_URL, timeout: number = DEFAULT_TIMEOUT) {
    this.baseUrl = baseUrl
    this.timeout = timeout
    // Load token from localStorage on initialization
    this.authToken = localStorage.getItem('auth_token')

    // Load current organization from localStorage
    const storedOrg = localStorage.getItem('current_organization')
    if (storedOrg) {
      try {
        const parsedOrg = JSON.parse(storedOrg)
        this.currentOrganizationId = parsedOrg.id
      } catch {
        // Invalid stored data, ignore
      }
    }
  }

  // Set authentication token
  setAuthToken(token: string | null) {
    this.authToken = token
    if (token) {
      localStorage.setItem('auth_token', token)
    } else {
      localStorage.removeItem('auth_token')
    }
  }

  // Get authentication token
  getAuthToken(): string | null {
    return this.authToken
  }

  // Set current organization ID for context
  setCurrentOrganizationId(organizationId: number | null) {
    this.currentOrganizationId = organizationId
  }

  // Get current organization ID
  getCurrentOrganizationId(): number | null {
    return this.currentOrganizationId
  }

  // Generic HTTP request method
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`

    // Set up request with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    // Add authorization header if token exists
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }

    // Add organization context header if organization is set
    if (this.currentOrganizationId) {
      headers['X-Organization-ID'] = this.currentOrganizationId.toString()
    }

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers,
      })

      clearTimeout(timeoutId)

      // Parse response body
      let responseData: unknown
      const contentType = response.headers.get('content-type')

      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json()
      } else {
        responseData = await response.text()
      }

      // Handle HTTP error status codes
      if (!response.ok) {
        const errorResponse: ErrorResponse =
          typeof responseData === 'object' && responseData !== null && 'error' in responseData
            ? (responseData as ErrorResponse)
            : {
                error: 'http_error',
                message: `HTTP ${response.status}: ${response.statusText}`,
              }

        // Handle 401 Unauthorized - clear token and organization
        if (response.status === 401) {
          this.setAuthToken(null)
          this.setCurrentOrganizationId(null)
        }

        return {
          success: false,
          error: errorResponse,
        }
      }

      return {
        success: true,
        data: responseData as T,
      }
    } catch (error) {
      clearTimeout(timeoutId)

      // Handle different types of errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: {
              error: 'timeout',
              message: 'Request timed out. Please try again.',
            },
          }
        }

        if (error.message.includes('Failed to fetch')) {
          return {
            success: false,
            error: {
              error: 'network_error',
              message: 'Network error. Please check your connection and try again.',
            },
          }
        }
      }

      return {
        success: false,
        error: {
          error: 'unknown_error',
          message: 'An unexpected error occurred. Please try again.',
        },
      }
    }
  }

  // GET request method
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  // POST request method
  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }
}

// Create singleton API client instance
const apiClient = new ApiClient()

// API service functions

/**
 * Check the health status of the backend service
 */
export async function checkHealth(): Promise<ApiResponse<HealthResponse>> {
  return apiClient.get<HealthResponse>('/health')
}

/**
 * Register a new user
 * @param registerData - User registration data
 */
export async function register(registerData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
  return apiClient.post<AuthResponse>('/auth/register', registerData)
}

/**
 * Login user
 * @param loginData - User login credentials
 */
export async function login(loginData: LoginRequest): Promise<ApiResponse<AuthResponse>> {
  return apiClient.post<AuthResponse>('/auth/login', loginData)
}

/**
 * Get current user information
 */
export async function getCurrentUser(): Promise<
  ApiResponse<{ user: User; organizations: Organization[] }>
> {
  return apiClient.get<{ user: User; organizations: Organization[] }>('/users/me')
}

/**
 * Get user organizations
 */
export async function getUserOrganizations(): Promise<
  ApiResponse<{ organizations: Organization[] }>
> {
  return apiClient.get<{ organizations: Organization[] }>('/organizations')
}

/**
 * Create a new organization
 * @param name - Organization name
 */
export async function createOrganization(
  name: string,
): Promise<ApiResponse<{ organization: Organization }>> {
  return apiClient.post<{ organization: Organization }>('/organizations', { name })
}

/**
 * Switch to a different organization
 * @param organizationId - ID of the organization to switch to
 */
export async function switchOrganization(
  organizationId: number,
): Promise<ApiResponse<{ organization: Organization }>> {
  const result = await apiClient.post<{ organization: Organization }>(
    `/organizations/${organizationId}/switch`,
  )

  // Update the API client's organization context if successful
  if (result.success) {
    apiClient.setCurrentOrganizationId(organizationId)
  }

  return result
}

/**
 * Update the API client's organization context
 * @param organizationId - ID of the current organization
 */
export function setCurrentOrganizationContext(organizationId: number | null) {
  apiClient.setCurrentOrganizationId(organizationId)
}

// Export the API client for advanced usage if needed
export { apiClient }
