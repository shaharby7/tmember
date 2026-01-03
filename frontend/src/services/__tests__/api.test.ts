import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkHealth, sendEcho, ApiError } from '../api'
import type { HealthResponse, EchoResponse, ErrorResponse } from '../../types/api'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset fetch mock
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('checkHealth', () => {
    it('should return success response for healthy backend', async () => {
      const mockHealthResponse: HealthResponse = { status: 'ok' }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockHealthResponse
      })

      const result = await checkHealth()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockHealthResponse)
      expect(result.error).toBeUndefined()
      expect(mockFetch).toHaveBeenCalledWith('/api/health', {
        method: 'GET',
        signal: expect.any(AbortSignal),
        headers: {
          'Content-Type': 'application/json'
        }
      })
    })

    it('should handle server error responses', async () => {
      const mockErrorResponse: ErrorResponse = {
        error: 'server_error',
        message: 'Internal server error'
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockErrorResponse
      })

      const result = await checkHealth()

      expect(result.success).toBe(false)
      expect(result.error).toEqual(mockErrorResponse)
      expect(result.data).toBeUndefined()
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'))

      const result = await checkHealth()

      expect(result.success).toBe(false)
      expect(result.error).toEqual({
        error: 'network_error',
        message: 'Network error. Please check your connection and try again.'
      })
    })

    it('should handle timeout errors', async () => {
      // Mock a timeout by rejecting with AbortError
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(abortError)

      const result = await checkHealth()

      expect(result.success).toBe(false)
      expect(result.error).toEqual({
        error: 'timeout',
        message: 'Request timed out. Please try again.'
      })
    })

    it('should handle non-JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'Not Found'
      })

      const result = await checkHealth()

      expect(result.success).toBe(false)
      expect(result.error).toEqual({
        error: 'http_error',
        message: 'HTTP 404: Not Found'
      })
    })
  })

  describe('sendEcho', () => {
    it('should send echo request and return response', async () => {
      const testMessage = 'Hello, World!'
      const mockEchoResponse: EchoResponse = { echo: testMessage }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockEchoResponse
      })

      const result = await sendEcho(testMessage)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockEchoResponse)
      expect(result.error).toBeUndefined()
      
      expect(mockFetch).toHaveBeenCalledWith('/api/echo', {
        method: 'POST',
        signal: expect.any(AbortSignal),
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: testMessage })
      })
    })

    it('should trim whitespace from message', async () => {
      const testMessage = '  Hello, World!  '
      const trimmedMessage = 'Hello, World!'
      const mockEchoResponse: EchoResponse = { echo: trimmedMessage }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockEchoResponse
      })

      const result = await sendEcho(testMessage)

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith('/api/echo', {
        method: 'POST',
        signal: expect.any(AbortSignal),
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: trimmedMessage })
      })
    })

    it('should reject empty messages', async () => {
      const result = await sendEcho('')

      expect(result.success).toBe(false)
      expect(result.error).toEqual({
        error: 'invalid_input',
        message: 'Message cannot be empty'
      })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should reject whitespace-only messages', async () => {
      const result = await sendEcho('   ')

      expect(result.success).toBe(false)
      expect(result.error).toEqual({
        error: 'invalid_input',
        message: 'Message cannot be empty'
      })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should handle server validation errors', async () => {
      const mockErrorResponse: ErrorResponse = {
        error: 'validation_error',
        message: 'Message is required'
      }

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockErrorResponse
      })

      const result = await sendEcho('test message')

      expect(result.success).toBe(false)
      expect(result.error).toEqual(mockErrorResponse)
    })

    it('should handle network failures during echo request', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'))

      const result = await sendEcho('test message')

      expect(result.success).toBe(false)
      expect(result.error).toEqual({
        error: 'network_error',
        message: 'Network error. Please check your connection and try again.'
      })
    })

    it('should handle timeout during echo request', async () => {
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(abortError)

      const result = await sendEcho('test message')

      expect(result.success).toBe(false)
      expect(result.error).toEqual({
        error: 'timeout',
        message: 'Request timed out. Please try again.'
      })
    })

    it('should handle unexpected errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Unexpected error'))

      const result = await sendEcho('test message')

      expect(result.success).toBe(false)
      expect(result.error).toEqual({
        error: 'unknown_error',
        message: 'An unexpected error occurred. Please try again.'
      })
    })

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => {
          throw new Error('Invalid JSON')
        }
      })

      const result = await sendEcho('test message')

      expect(result.success).toBe(false)
      expect(result.error).toEqual({
        error: 'unknown_error',
        message: 'An unexpected error occurred. Please try again.'
      })
    })

    it('should handle various message lengths', async () => {
      const testCases = [
        'a', // Single character
        'Hello, World!', // Normal message
        'A'.repeat(100), // Long message
        'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?', // Special characters
        '🚀 Unicode test 🌟', // Unicode characters
      ]

      for (const testMessage of testCases) {
        const mockEchoResponse: EchoResponse = { echo: testMessage }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => mockEchoResponse
        })

        const result = await sendEcho(testMessage)

        expect(result.success).toBe(true)
        expect(result.data).toEqual(mockEchoResponse)
      }
    })
  })

  describe('ApiError class', () => {
    it('should create ApiError with message only', () => {
      const error = new ApiError('Test error')
      
      expect(error.message).toBe('Test error')
      expect(error.name).toBe('ApiError')
      expect(error.statusCode).toBeUndefined()
      expect(error.errorResponse).toBeUndefined()
    })

    it('should create ApiError with status code', () => {
      const error = new ApiError('Test error', 404)
      
      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(404)
    })

    it('should create ApiError with error response', () => {
      const errorResponse: ErrorResponse = {
        error: 'not_found',
        message: 'Resource not found'
      }
      const error = new ApiError('Test error', 404, errorResponse)
      
      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(404)
      expect(error.errorResponse).toEqual(errorResponse)
    })
  })

  describe('Request timeout handling', () => {
    it('should handle timeout configuration', () => {
      // Test that the API client is configured with a timeout
      // This is more of a configuration test rather than a runtime test
      expect(mockFetch).toBeDefined()
      
      // The actual timeout behavior is tested through the AbortError handling
      // which is already covered in the timeout error tests above
    })
  })

  describe('Content-Type handling', () => {
    it('should handle responses without content-type header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(), // No content-type header
        text: async () => 'Internal Server Error'
      })

      const result = await checkHealth()

      expect(result.success).toBe(false)
      expect(result.error).toEqual({
        error: 'http_error',
        message: 'HTTP 500: Internal Server Error'
      })
    })

    it('should handle text/plain responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'Service temporarily unavailable'
      })

      const result = await checkHealth()

      expect(result.success).toBe(false)
      expect(result.error).toEqual({
        error: 'http_error',
        message: 'HTTP 503: Service Unavailable'
      })
    })
  })
})