/**
 * End-to-End Authentication Workflow Tests
 * Tests complete user registration and login flow, authentication state persistence,
 * session management, and error handling
 * Requirements: 10.1, 10.2, 10.3, 10.6, 10.7
 */

import { execSync, spawn } from 'child_process'
import { setTimeout } from 'timers/promises'

describe('End-to-End Authentication Workflow Tests', () => {
  let composeProcess
  const BACKEND_URL = 'http://localhost:8080'
  const FRONTEND_URL = 'http://localhost:3000'
  const HEALTH_TIMEOUT = 90000 // 90 seconds for services to start

  // Test user data
  const testUser = {
    email: 'test@example.com',
    password: 'SecurePassword123!',
  }

  const testUser2 = {
    email: 'test2@example.com',
    password: 'AnotherSecure456!',
  }

  beforeAll(async () => {
    // Clean up any existing containers
    try {
      execSync('docker-compose down -v', { stdio: 'ignore' })
    } catch (error) {
      // Ignore errors if no containers exist
    }

    // Start Docker Compose services
    composeProcess = spawn('docker-compose', ['up', '--build'], {
      detached: false,
      stdio: 'pipe',
    })

    // Wait for services to be healthy
    await waitForServicesHealthy()
  }, HEALTH_TIMEOUT + 10000)

  afterAll(async () => {
    // Clean up Docker Compose services
    if (composeProcess) {
      composeProcess.kill()
    }

    try {
      execSync('docker-compose down -v', { stdio: 'ignore' })
    } catch (error) {
      console.warn('Error cleaning up Docker containers:', error.message)
    }
  })

  describe('Complete User Registration Flow', () => {
    test('should successfully register a new user with valid credentials', async () => {
      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      })

      expect(response.ok).toBe(true)
      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data).toHaveProperty('user')
      expect(data).toHaveProperty('token')
      expect(data.user.email).toBe(testUser.email)
      expect(data.user).toHaveProperty('id')
      expect(data.user).not.toHaveProperty('password')
      expect(data.user).not.toHaveProperty('password_hash')
      expect(typeof data.token).toBe('string')
      expect(data.token.length).toBeGreaterThan(0)
    })

    test('should prevent duplicate email registration', async () => {
      // Try to register the same user again
      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(409) // Conflict

      const errorData = await response.json()
      expect(errorData).toHaveProperty('error')
      expect(errorData.error.toLowerCase()).toContain('email')
    })

    test('should validate email format during registration', async () => {
      const invalidEmailUser = {
        email: 'invalid-email',
        password: 'ValidPassword123!',
      }

      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidEmailUser),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)

      const errorData = await response.json()
      expect(errorData).toHaveProperty('error')
    })

    test('should validate password security criteria during registration', async () => {
      const weakPasswordUser = {
        email: 'weak@example.com',
        password: '123',
      }

      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(weakPasswordUser),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)

      const errorData = await response.json()
      expect(errorData).toHaveProperty('error')
    })

    test('should handle missing registration fields', async () => {
      const incompleteUser = {
        email: 'incomplete@example.com',
        // Missing password
      }

      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(incompleteUser),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)

      const errorData = await response.json()
      expect(errorData).toHaveProperty('error')
    })
  })

  describe('Complete User Login Flow', () => {
    test('should successfully login with valid credentials', async () => {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      })

      expect(response.ok).toBe(true)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('user')
      expect(data).toHaveProperty('token')
      expect(data.user.email).toBe(testUser.email)
      expect(data.user).toHaveProperty('id')
      expect(data.user).not.toHaveProperty('password')
      expect(data.user).not.toHaveProperty('password_hash')
      expect(typeof data.token).toBe('string')
      expect(data.token.length).toBeGreaterThan(0)
    })

    test('should reject login with incorrect password', async () => {
      const invalidCredentials = {
        email: testUser.email,
        password: 'WrongPassword123!',
      }

      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidCredentials),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)

      const errorData = await response.json()
      expect(errorData).toHaveProperty('error')
    })

    test('should reject login with non-existent email', async () => {
      const nonExistentUser = {
        email: 'nonexistent@example.com',
        password: 'SomePassword123!',
      }

      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nonExistentUser),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)

      const errorData = await response.json()
      expect(errorData).toHaveProperty('error')
    })

    test('should handle malformed login requests', async () => {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testUser.email,
          // Missing password
        }),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)

      const errorData = await response.json()
      expect(errorData).toHaveProperty('error')
    })
  })

  describe('Authentication Session Management', () => {
    let authToken

    beforeAll(async () => {
      // Register and login to get a valid token
      await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser2),
      })

      const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser2),
      })

      const loginData = await loginResponse.json()
      authToken = loginData.token
    })

    test('should access protected endpoints with valid token', async () => {
      const response = await fetch(`${BACKEND_URL}/api/users/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      })

      expect(response.ok).toBe(true)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('user')
      expect(data.user.email).toBe(testUser2.email)
    })

    test('should reject access to protected endpoints without token', async () => {
      const response = await fetch(`${BACKEND_URL}/api/users/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)

      const errorData = await response.json()
      expect(errorData).toHaveProperty('error')
    })

    test('should reject access with invalid token', async () => {
      const response = await fetch(`${BACKEND_URL}/api/users/me`, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer invalid-token-here',
          'Content-Type': 'application/json',
        },
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)

      const errorData = await response.json()
      expect(errorData).toHaveProperty('error')
    })

    test('should reject access with malformed authorization header', async () => {
      const response = await fetch(`${BACKEND_URL}/api/users/me`, {
        method: 'GET',
        headers: {
          Authorization: 'InvalidFormat token-here',
          'Content-Type': 'application/json',
        },
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)

      const errorData = await response.json()
      expect(errorData).toHaveProperty('error')
    })

    test('should maintain session consistency across multiple requests', async () => {
      // Make multiple requests with the same token
      const requests = Array.from({ length: 5 }, () =>
        fetch(`${BACKEND_URL}/api/users/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        })
      )

      const responses = await Promise.all(requests)

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.ok).toBe(true)
        expect(response.status).toBe(200)
      })

      // All responses should return the same user data
      const userData = await Promise.all(responses.map((r) => r.json()))
      userData.forEach((data) => {
        expect(data.user.email).toBe(testUser2.email)
        expect(data.user.id).toBe(userData[0].user.id)
      })
    })
  })

  describe('Authentication Error Handling and Recovery', () => {
    test('should handle server errors gracefully during registration', async () => {
      // Test with extremely long email to potentially trigger server error
      const problematicUser = {
        email: 'a'.repeat(1000) + '@example.com',
        password: 'ValidPassword123!',
      }

      const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(problematicUser),
      })

      // Should handle gracefully with appropriate error response
      expect(response.ok).toBe(false)
      expect([400, 422, 500]).toContain(response.status)

      const errorData = await response.json()
      expect(errorData).toHaveProperty('error')
    })

    test('should handle concurrent registration attempts', async () => {
      const concurrentUser = {
        email: 'concurrent@example.com',
        password: 'ConcurrentTest123!',
      }

      // Make multiple concurrent registration requests
      const promises = Array.from({ length: 3 }, () =>
        fetch(`${BACKEND_URL}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(concurrentUser),
        })
      )

      const responses = await Promise.all(promises)

      // Only one should succeed, others should fail with conflict
      const successfulResponses = responses.filter((r) => r.ok)
      const failedResponses = responses.filter((r) => !r.ok)

      expect(successfulResponses.length).toBe(1)
      expect(failedResponses.length).toBe(2)

      // Failed responses should be conflicts
      failedResponses.forEach((response) => {
        expect(response.status).toBe(409)
      })
    })

    test('should handle malformed JSON in authentication requests', async () => {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json{',
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)

      const errorData = await response.json()
      expect(errorData).toHaveProperty('error')
    })

    test('should recover from temporary authentication service issues', async () => {
      // Test system stability with rapid authentication requests
      const rapidRequests = Array.from({ length: 10 }, (_, i) => ({
        email: `rapid${i}@example.com`,
        password: 'RapidTest123!',
      }))

      // Register users rapidly
      const registrationPromises = rapidRequests.map((user) =>
        fetch(`${BACKEND_URL}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(user),
        })
      )

      const registrationResponses = await Promise.all(registrationPromises)

      // Most should succeed (allowing for some rate limiting)
      const successfulRegistrations = registrationResponses.filter((r) => r.ok)
      expect(successfulRegistrations.length).toBeGreaterThan(5)

      // Login with successfully registered users
      const loginPromises = successfulRegistrations.map(async (_, i) =>
        fetch(`${BACKEND_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(rapidRequests[i]),
        })
      )

      const loginResponses = await Promise.all(loginPromises)

      // All logins should succeed
      loginResponses.forEach((response) => {
        expect(response.ok).toBe(true)
      })
    })
  })

  describe('Authentication State Persistence', () => {
    test('should maintain user data consistency after authentication', async () => {
      const persistenceUser = {
        email: 'persistence@example.com',
        password: 'PersistenceTest123!',
      }

      // Register user
      const registerResponse = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(persistenceUser),
      })

      expect(registerResponse.ok).toBe(true)
      const registerData = await registerResponse.json()

      // Login user
      const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(persistenceUser),
      })

      expect(loginResponse.ok).toBe(true)
      const loginData = await loginResponse.json()

      // User data should be consistent between registration and login
      expect(loginData.user.id).toBe(registerData.user.id)
      expect(loginData.user.email).toBe(registerData.user.email)
      expect(loginData.user.email).toBe(persistenceUser.email)

      // Get user profile to verify persistence
      const profileResponse = await fetch(`${BACKEND_URL}/api/users/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${loginData.token}`,
          'Content-Type': 'application/json',
        },
      })

      expect(profileResponse.ok).toBe(true)
      const profileData = await profileResponse.json()

      // Profile data should match registration and login data
      expect(profileData.user.id).toBe(registerData.user.id)
      expect(profileData.user.email).toBe(persistenceUser.email)
    })

    test('should persist user data across service restarts', async () => {
      const restartUser = {
        email: 'restart@example.com',
        password: 'RestartTest123!',
      }

      // Register user before restart
      const registerResponse = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(restartUser),
      })

      expect(registerResponse.ok).toBe(true)
      const registerData = await registerResponse.json()

      // Restart backend service
      execSync('docker-compose restart backend', { timeout: 30000 })

      // Wait for backend to be healthy again
      await waitForBackendHealthy()

      // Try to login after restart
      const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(restartUser),
      })

      expect(loginResponse.ok).toBe(true)
      const loginData = await loginResponse.json()

      // User should still exist with same ID
      expect(loginData.user.id).toBe(registerData.user.id)
      expect(loginData.user.email).toBe(restartUser.email)
    })
  })

  /**
   * Helper function to wait for services to become healthy
   */
  async function waitForServicesHealthy() {
    const maxAttempts = 45 // 45 attempts with 2-second intervals = 90 seconds max
    let attempts = 0

    while (attempts < maxAttempts) {
      try {
        // Check MySQL health first
        const mysqlHealthy = await checkMySQLHealth()

        // Check backend health
        const backendResponse = await fetch(`${BACKEND_URL}/api/health`, {
          signal: AbortSignal.timeout(5000), // 5 second timeout
        })

        // Check frontend accessibility
        const frontendResponse = await fetch(FRONTEND_URL, {
          signal: AbortSignal.timeout(5000), // 5 second timeout
        })

        if (mysqlHealthy && backendResponse.ok && frontendResponse.ok) {
          console.log('All services are healthy and ready for testing')
          return
        }
      } catch (error) {
        // Services not ready yet, continue waiting
      }

      attempts++
      await setTimeout(2000) // Wait 2 seconds before next attempt
    }

    throw new Error('Services failed to become healthy within timeout period')
  }

  /**
   * Helper function to wait for backend to be healthy after restart
   */
  async function waitForBackendHealthy() {
    const maxAttempts = 30
    let attempts = 0

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/health`, {
          signal: AbortSignal.timeout(5000),
        })

        if (response.ok) {
          return
        }
      } catch (error) {
        // Backend not ready yet
      }

      attempts++
      await setTimeout(2000)
    }

    throw new Error('Backend failed to become healthy after restart')
  }

  /**
   * Helper function to check MySQL health
   */
  async function checkMySQLHealth() {
    try {
      execSync('docker-compose exec -T mysql mysqladmin ping -h localhost -u root -prootpassword', {
        timeout: 5000,
        stdio: 'ignore',
      })
      return true
    } catch (error) {
      return false
    }
  }
})
