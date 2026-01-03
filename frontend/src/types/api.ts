// TypeScript interfaces matching the Go backend models

export interface HealthResponse {
  status: string
}

export interface EchoRequest {
  message: string
}

export interface EchoResponse {
  echo: string
}

export interface ErrorResponse {
  error: string
  message?: string
}

// API response wrapper for better error handling
export interface ApiResponse<T> {
  data?: T
  error?: ErrorResponse
  success: boolean
}