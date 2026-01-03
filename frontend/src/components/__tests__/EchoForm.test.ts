import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import fc from 'fast-check'
import EchoForm from '../EchoForm.vue'
import * as apiService from '../../services/api'
import type { ApiResponse, EchoResponse } from '../../types/api'

// Mock the API service
vi.mock('../../services/api')
vi.mock('../HealthStatus.vue', () => ({
  default: {
    name: 'HealthStatus',
    template: '<div data-testid="health-status">Health Status Mock</div>'
  }
}))

describe('EchoForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Property 3: Error Message Display', () => {
    /**
     * Feature: tmember-monorepo, Property 3: Error Message Display
     * Validates: Requirements 8.6
     * 
     * Property: For any failed API request (network error, server error, invalid input), 
     * the frontend should display a user-friendly error message indicating the failure.
     */
    it('should display user-friendly error messages for all types of API failures', async () => {
      const errorResponseArb = fc.oneof(
        // Network errors
        fc.record({
          success: fc.constant(false),
          error: fc.record({
            error: fc.constant('network_error'),
            message: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
          })
        }),
        // Timeout errors
        fc.record({
          success: fc.constant(false),
          error: fc.record({
            error: fc.constant('timeout'),
            message: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
          })
        }),
        // Server errors
        fc.record({
          success: fc.constant(false),
          error: fc.record({
            error: fc.constant('server_error'),
            message: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
          })
        }),
        // Invalid input errors
        fc.record({
          success: fc.constant(false),
          error: fc.record({
            error: fc.constant('invalid_input'),
            message: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
          })
        }),
        // HTTP errors
        fc.record({
          success: fc.constant(false),
          error: fc.record({
            error: fc.constant('http_error'),
            message: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
          })
        }),
        // Unknown errors
        fc.record({
          success: fc.constant(false),
          error: fc.record({
            error: fc.constant('unknown_error'),
            message: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
          })
        })
      )

      const messageInputArb = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)

      await fc.assert(
        fc.asyncProperty(
          errorResponseArb,
          messageInputArb,
          async (errorResponse: ApiResponse<EchoResponse>, messageInput: string) => {
            // Mock the sendEcho function to return the error response
            const mockSendEcho = vi.mocked(apiService.sendEcho)
            mockSendEcho.mockResolvedValue(errorResponse)

            // Mount the component
            const wrapper = mount(EchoForm)

            // Find the input and form
            const input = wrapper.find('input[type="text"]')
            const form = wrapper.find('form')

            // Set the input value and submit the form
            await input.setValue(messageInput)
            await form.trigger('submit')

            // Wait for the async operation to complete
            await wrapper.vm.$nextTick()
            await new Promise(resolve => setTimeout(resolve, 0))

            // Verify that an error message is displayed
            const errorElement = wrapper.find('.response.error')
            expect(errorElement.exists()).toBe(true)

            // Verify that the error message is user-friendly (not empty and contains text)
            const errorText = errorElement.text()
            expect(errorText).toBeTruthy()
            expect(errorText.length).toBeGreaterThan(0)

            // Verify that the error message contains either the custom message or a fallback
            const expectedMessage = errorResponse.error?.message || `Error: ${errorResponse.error?.error}`
            const trimmedExpectedMessage = expectedMessage.trim()
            expect(errorText).toContain(trimmedExpectedMessage)

            // Verify that the error element has proper styling classes
            expect(errorElement.classes()).toContain('error')
            expect(errorElement.classes()).toContain('response')

            // Verify that the error is displayed prominently (has a header)
            const errorHeader = errorElement.find('h3')
            expect(errorHeader.exists()).toBe(true)
            expect(errorHeader.text()).toContain('Error')
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in the design document
      )
    })
  })

  describe('Error Message Display - Specific Scenarios', () => {
    it('should display error message for network failures', async () => {
      const mockSendEcho = vi.mocked(apiService.sendEcho)
      mockSendEcho.mockResolvedValue({
        success: false,
        error: {
          error: 'network_error',
          message: 'Network error. Please check your connection and try again.'
        }
      })

      const wrapper = mount(EchoForm)
      const input = wrapper.find('input[type="text"]')
      const form = wrapper.find('form')

      await input.setValue('test message')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      const errorElement = wrapper.find('.response.error')
      expect(errorElement.exists()).toBe(true)
      expect(errorElement.text()).toContain('Network error. Please check your connection and try again.')
    })

    it('should display error message for server errors', async () => {
      const mockSendEcho = vi.mocked(apiService.sendEcho)
      mockSendEcho.mockResolvedValue({
        success: false,
        error: {
          error: 'server_error',
          message: 'Internal server error occurred.'
        }
      })

      const wrapper = mount(EchoForm)
      const input = wrapper.find('input[type="text"]')
      const form = wrapper.find('form')

      await input.setValue('test message')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      const errorElement = wrapper.find('.response.error')
      expect(errorElement.exists()).toBe(true)
      expect(errorElement.text()).toContain('Internal server error occurred.')
    })

    it('should display retry button for failed requests', async () => {
      const mockSendEcho = vi.mocked(apiService.sendEcho)
      mockSendEcho.mockResolvedValue({
        success: false,
        error: {
          error: 'timeout',
          message: 'Request timed out. Please try again.'
        }
      })

      const wrapper = mount(EchoForm)
      const input = wrapper.find('input[type="text"]')
      const form = wrapper.find('form')

      await input.setValue('test message')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      const errorElement = wrapper.find('.response.error')
      expect(errorElement.exists()).toBe(true)
      
      const retryButton = errorElement.find('.retry-button')
      expect(retryButton.exists()).toBe(true)
      expect(retryButton.text()).toBe('Retry')
    })

    it('should handle errors without custom messages', async () => {
      const mockSendEcho = vi.mocked(apiService.sendEcho)
      mockSendEcho.mockResolvedValue({
        success: false,
        error: {
          error: 'unknown_error'
          // No message property
        }
      })

      const wrapper = mount(EchoForm)
      const input = wrapper.find('input[type="text"]')
      const form = wrapper.find('form')

      await input.setValue('test message')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      const errorElement = wrapper.find('.response.error')
      expect(errorElement.exists()).toBe(true)
      expect(errorElement.text()).toContain('Error: unknown_error')
    })
  })

  describe('Success Response Display', () => {
    it('should display success response when API call succeeds', async () => {
      const testMessage = 'Hello, World!'
      const mockSendEcho = vi.mocked(apiService.sendEcho)
      mockSendEcho.mockResolvedValue({
        success: true,
        data: {
          echo: testMessage
        }
      })

      const wrapper = mount(EchoForm)
      const input = wrapper.find('input[type="text"]')
      const form = wrapper.find('form')

      await input.setValue(testMessage)
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      const successElement = wrapper.find('.response.success')
      expect(successElement.exists()).toBe(true)
      expect(successElement.text()).toContain(testMessage)

      // Verify no error is displayed
      const errorElement = wrapper.find('.response.error')
      expect(errorElement.exists()).toBe(false)
    })
  })

  describe('Component Rendering and User Interactions', () => {
    it('should render all required form elements', () => {
      const wrapper = mount(EchoForm)

      // Check for main form elements
      expect(wrapper.find('h2').text()).toBe('Echo Test')
      expect(wrapper.find('form').exists()).toBe(true)
      expect(wrapper.find('input[type="text"]').exists()).toBe(true)
      expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
      expect(wrapper.find('label[for="message"]').exists()).toBe(true)

      // Check for HealthStatus component
      expect(wrapper.find('[data-testid="health-status"]').exists()).toBe(true)
    })

    it('should enable/disable submit button based on input validity', async () => {
      const wrapper = mount(EchoForm)
      const input = wrapper.find('input[type="text"]')
      const submitButton = wrapper.find('button[type="submit"]')

      // Initially disabled with empty input
      expect(submitButton.attributes('disabled')).toBeDefined()

      // Enable when valid input is provided
      await input.setValue('test message')
      await wrapper.vm.$nextTick()
      expect(submitButton.attributes('disabled')).toBeUndefined()

      // Disable when input is cleared
      await input.setValue('')
      await wrapper.vm.$nextTick()
      expect(submitButton.attributes('disabled')).toBeDefined()

      // Disable when input is only whitespace
      await input.setValue('   ')
      await wrapper.vm.$nextTick()
      expect(submitButton.attributes('disabled')).toBeDefined()
    })

    it('should show character count when typing', async () => {
      const wrapper = mount(EchoForm)
      const input = wrapper.find('input[type="text"]')

      // No character count initially
      expect(wrapper.find('.character-count').exists()).toBe(false)

      // Show character count when typing
      await input.setValue('Hello')
      await wrapper.vm.$nextTick()
      
      const characterCount = wrapper.find('.character-count')
      expect(characterCount.exists()).toBe(true)
      expect(characterCount.text()).toBe('5/1000')
    })

    it('should show validation error for empty input on submit', async () => {
      const wrapper = mount(EchoForm)
      const form = wrapper.find('form')

      await form.trigger('submit')
      await wrapper.vm.$nextTick()

      const validationError = wrapper.find('.validation-error')
      expect(validationError.exists()).toBe(true)
      expect(validationError.text()).toBe('Please enter a message')
    })

    it('should show validation error for messages exceeding character limit', async () => {
      const wrapper = mount(EchoForm)
      const input = wrapper.find('input[type="text"]')
      const form = wrapper.find('form')

      // Create a message longer than 1000 characters
      const longMessage = 'a'.repeat(1001)
      await input.setValue(longMessage)
      await form.trigger('submit')
      await wrapper.vm.$nextTick()

      const validationError = wrapper.find('.validation-error')
      expect(validationError.exists()).toBe(true)
      expect(validationError.text()).toBe('Message is too long (max 1000 characters)')
    })

    it('should clear input field after successful submission', async () => {
      const mockSendEcho = vi.mocked(apiService.sendEcho)
      mockSendEcho.mockResolvedValue({
        success: true,
        data: { echo: 'test message' }
      })

      const wrapper = mount(EchoForm)
      const input = wrapper.find('input[type="text"]')
      const form = wrapper.find('form')

      await input.setValue('test message')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Input should be cleared after successful submission
      expect((input.element as HTMLInputElement).value).toBe('')
    })

    it('should show loading state during API request', async () => {
      const mockSendEcho = vi.mocked(apiService.sendEcho)
      // Create a promise that we can control
      let resolvePromise: (value: any) => void
      const pendingPromise = new Promise<ApiResponse<EchoResponse>>(resolve => {
        resolvePromise = resolve
      })
      mockSendEcho.mockReturnValue(pendingPromise)

      const wrapper = mount(EchoForm)
      const input = wrapper.find('input[type="text"]')
      const form = wrapper.find('form')
      const submitButton = wrapper.find('button[type="submit"]')

      await input.setValue('test message')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()

      // Check loading state
      expect(submitButton.text()).toContain('Sending...')
      expect(submitButton.attributes('disabled')).toBeDefined()
      expect(input.attributes('disabled')).toBeDefined()
      expect(wrapper.find('.loading-spinner').exists()).toBe(true)

      // Resolve the promise to complete the test
      resolvePromise!({
        success: true,
        data: { echo: 'test message' }
      })
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    it('should clear error and response messages when user starts typing', async () => {
      const mockSendEcho = vi.mocked(apiService.sendEcho)
      mockSendEcho.mockResolvedValue({
        success: false,
        error: { error: 'test_error', message: 'Test error message' }
      })

      const wrapper = mount(EchoForm)
      const input = wrapper.find('input[type="text"]')
      const form = wrapper.find('form')

      // Submit to generate an error
      await input.setValue('test message')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Verify error is displayed
      expect(wrapper.find('.response.error').exists()).toBe(true)

      // Start typing to clear messages
      await input.trigger('input')
      await wrapper.vm.$nextTick()

      // Error should be cleared
      expect(wrapper.find('.response.error').exists()).toBe(false)
    })

    it('should handle retry functionality', async () => {
      const mockSendEcho = vi.mocked(apiService.sendEcho)
      
      // First call fails
      mockSendEcho.mockResolvedValueOnce({
        success: false,
        error: { error: 'network_error', message: 'Network failed' }
      })

      // Second call succeeds
      mockSendEcho.mockResolvedValueOnce({
        success: true,
        data: { echo: 'retry message' }
      })

      const wrapper = mount(EchoForm)
      const input = wrapper.find('input[type="text"]')
      const form = wrapper.find('form')

      // Submit initial message
      await input.setValue('retry message')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Verify error is displayed with retry button
      const errorElement = wrapper.find('.response.error')
      expect(errorElement.exists()).toBe(true)
      const retryButton = errorElement.find('.retry-button')
      expect(retryButton.exists()).toBe(true)

      // Click retry button
      await retryButton.trigger('click')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Verify success response is now displayed
      const successElement = wrapper.find('.response.success')
      expect(successElement.exists()).toBe(true)
      expect(successElement.text()).toContain('retry message')
    })

    it('should maintain response history', async () => {
      const mockSendEcho = vi.mocked(apiService.sendEcho)
      
      // Mock successful responses
      mockSendEcho.mockResolvedValueOnce({
        success: true,
        data: { echo: 'first message' }
      })
      mockSendEcho.mockResolvedValueOnce({
        success: false,
        error: { error: 'test_error', message: 'Test error' }
      })

      const wrapper = mount(EchoForm)
      const input = wrapper.find('input[type="text"]')
      const form = wrapper.find('form')

      // Send first message (success)
      await input.setValue('first message')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Send second message (failure)
      await input.setValue('second message')
      await form.trigger('submit')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Check history section appears
      const historySection = wrapper.find('.history-section')
      expect(historySection.exists()).toBe(true)

      // Check history items
      const historyItems = wrapper.findAll('.history-item')
      expect(historyItems.length).toBe(2)

      // Check success and error status indicators
      const successStatus = wrapper.find('.history-status.success')
      const errorStatus = wrapper.find('.history-status.error')
      expect(successStatus.exists()).toBe(true)
      expect(errorStatus.exists()).toBe(true)
    })

    it('should clear history when clear button is clicked', async () => {
      const mockSendEcho = vi.mocked(apiService.sendEcho)
      
      // Add multiple successful responses to create history
      for (let i = 0; i < 5; i++) {
        mockSendEcho.mockResolvedValueOnce({
          success: true,
          data: { echo: `message ${i}` }
        })
      }

      const wrapper = mount(EchoForm)
      const input = wrapper.find('input[type="text"]')
      const form = wrapper.find('form')

      // Send multiple messages to build history
      for (let i = 0; i < 5; i++) {
        await input.setValue(`message ${i}`)
        await form.trigger('submit')
        await wrapper.vm.$nextTick()
        await new Promise(resolve => setTimeout(resolve, 0))
      }

      // Verify history exists
      expect(wrapper.findAll('.history-item').length).toBe(5)
      
      // Click clear history button
      const clearButton = wrapper.find('.clear-history-button')
      expect(clearButton.exists()).toBe(true)
      await clearButton.trigger('click')
      await wrapper.vm.$nextTick()

      // Verify history is cleared
      expect(wrapper.find('.history-section').exists()).toBe(false)
    })
  })
})