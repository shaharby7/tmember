// TypeScript interfaces matching the Go backend models

export interface HealthResponse {
  status: string
}

export interface ErrorResponse {
  error: string
  message?: string
}

// Authentication types
export interface User {
  id: number
  email: string
  created_at: string
  updated_at: string
}

export interface Organization {
  id: number
  name: string
  billing_details?: any
  created_at: string
  updated_at: string
}

export interface OrganizationMembership {
  id: number
  user_id: number
  organization_id: number
  role: 'admin' | 'member'
  created_at: string
  updated_at: string
  user?: User
  organization?: Organization
}

export interface RegisterRequest {
  email: string
  password: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  token: string
}

export interface CreateOrganizationRequest {
  name: string
}

// API response wrapper for better error handling
export interface ApiResponse<T> {
  data?: T
  error?: ErrorResponse
  success: boolean
}
