import type { 
  HealthResponse, 
  EchoRequest, 
  EchoResponse, 
  ErrorResponse, 
  ApiResponse 
} from '../types/api'

// Base API configuration
const API_BASE_URL = '/api' // Proxied through Vite dev server
const DEFAULT_TIMEOUT = 10000 // 10 seconds

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorResponse?: ErrorResponse
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// HTTP client class for API communication
class ApiClient {
  private baseUrl: string
  private timeout: number

  constructor(baseUrl: string = API_BASE_URL, timeout: number = DEFAULT_TIMEOUT) {
    this.baseUrl = baseUrl
    this.timeout = timeout
  }

  // Generic HTTP request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    
    // Set up request with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
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
            ? responseData as ErrorResponse
            : { 
                error: 'http_error', 
                message: `HTTP ${response.status}: ${response.statusText}` 
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
 * Send an echo request to the backend
 * @param message - The message to echo
 */
export async function sendEcho(message: string): Promise<ApiResponse<EchoResponse>> {
  if (!message || !message.trim()) {
    return {
      success: false,
      error: {
        error: 'invalid_input',
        message: 'Message cannot be empty',
      },
    }
  }

  const request: EchoRequest = { message: message.trim() }
  return apiClient.post<EchoResponse>('/echo', request)
}

// Export the API client for advanced usage if needed
export { apiClient }