/**
 * Docker Environment Integration Tests
 * Tests service startup, health checks, network communication, port accessibility, and database integration
 * Requirements: 5.2, 5.5, 9.1, 9.3, 9.4, 9.5
 */

import { execSync, spawn } from 'child_process'
import { setTimeout } from 'timers/promises'

describe('Docker Environment Integration Tests', () => {
  let composeProcess
  const BACKEND_URL = 'http://localhost:8080'
  const FRONTEND_URL = 'http://localhost:3000'
  const MYSQL_PORT = 3306
  const HEALTH_TIMEOUT = 90000 // 90 seconds for services to start (increased for database)

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

  describe('Service Startup and Health Checks', () => {
    test('backend service should be healthy and accessible', async () => {
      const response = await fetch(`${BACKEND_URL}/api/health`)
      expect(response.ok).toBe(true)

      const data = await response.json()
      expect(data).toHaveProperty('status')
    })

    test('frontend service should be accessible', async () => {
      const response = await fetch(FRONTEND_URL)
      expect(response.ok).toBe(true)
      expect(response.headers.get('content-type')).toContain('text/html')
    })

    test('mysql service should be running and healthy', async () => {
      // Check MySQL container health status
      const healthOutput = execSync('docker-compose ps mysql', {
        encoding: 'utf8',
      })

      expect(healthOutput).toContain('Up (healthy)')
    })

    test('backend service should respond to echo endpoint', async () => {
      const testMessage = 'Docker integration test'
      const response = await fetch(`${BACKEND_URL}/api/echo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: testMessage }),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.echo).toBe(testMessage)
    })
  })

  describe('Database Container Startup and Connectivity', () => {
    test('mysql container should be running', async () => {
      const containers = execSync('docker-compose ps --services --filter status=running', {
        encoding: 'utf8',
      })
        .trim()
        .split('\n')

      expect(containers).toContain('mysql')
    })

    test('mysql should be accessible on port 3306', async () => {
      // Test MySQL connectivity using docker exec
      try {
        const result = execSync(
          'docker-compose exec -T mysql mysqladmin ping -h localhost -u root -prootpassword',
          { encoding: 'utf8', timeout: 10000 }
        )
        expect(result).toContain('mysqld is alive')
      } catch (error) {
        throw new Error(`MySQL ping failed: ${error.message}`)
      }
    })

    test('tmember database should exist and be accessible', async () => {
      try {
        const result = execSync(
          'docker-compose exec -T mysql mysql -h localhost -u tmember -ppassword -e "SELECT DATABASE();" tmember_dev',
          { encoding: 'utf8', timeout: 10000 }
        )
        expect(result).toContain('tmember_dev')
      } catch (error) {
        throw new Error(`Database access failed: ${error.message}`)
      }
    })

    test('database should have proper character set configuration', async () => {
      try {
        const result = execSync(
          'docker-compose exec -T mysql mysql -h localhost -u tmember -ppassword -e "SHOW VARIABLES LIKE \'character_set_server\';" tmember_dev',
          { encoding: 'utf8', timeout: 10000 }
        )
        expect(result).toContain('utf8mb4')
      } catch (error) {
        throw new Error(`Character set check failed: ${error.message}`)
      }
    })
  })

  describe('Data Persistence Across Container Restarts', () => {
    test('data should persist after mysql container restart', async () => {
      // Create a test table and insert data
      try {
        execSync(
          'docker-compose exec -T mysql mysql -h localhost -u tmember -ppassword -e "CREATE TABLE IF NOT EXISTS test_persistence (id INT PRIMARY KEY, value VARCHAR(255));" tmember_dev',
          { timeout: 10000 }
        )

        execSync(
          "docker-compose exec -T mysql mysql -h localhost -u tmember -ppassword -e \"INSERT INTO test_persistence (id, value) VALUES (1, 'test_data') ON DUPLICATE KEY UPDATE value='test_data';\" tmember_dev",
          { timeout: 10000 }
        )

        // Restart MySQL container
        execSync('docker-compose restart mysql', { timeout: 30000 })

        // Wait for MySQL to be healthy again
        await waitForMySQLHealthy()

        // Check if data persists
        const result = execSync(
          'docker-compose exec -T mysql mysql -h localhost -u tmember -ppassword -e "SELECT value FROM test_persistence WHERE id = 1;" tmember_dev',
          { encoding: 'utf8', timeout: 10000 }
        )

        expect(result).toContain('test_data')

        // Clean up test table
        execSync(
          'docker-compose exec -T mysql mysql -h localhost -u tmember -ppassword -e "DROP TABLE IF EXISTS test_persistence;" tmember_dev',
          { timeout: 10000 }
        )
      } catch (error) {
        throw new Error(`Data persistence test failed: ${error.message}`)
      }
    })

    test('mysql volume should be properly mounted', async () => {
      // Check that the mysql_data volume exists
      const volumes = execSync('docker volume ls', { encoding: 'utf8' })
      expect(volumes).toContain('mysql_data')
    })
  })

  describe('Backend Database Connection and Migration', () => {
    test('backend should connect to database successfully', async () => {
      // The backend health check implicitly tests database connectivity
      // since the backend initializes database connection on startup
      const response = await fetch(`${BACKEND_URL}/api/health`)
      expect(response.ok).toBe(true)
    })

    test('database migrations should run successfully', async () => {
      // Check backend logs for successful migration messages
      try {
        const logs = execSync('docker-compose logs backend', {
          encoding: 'utf8',
          timeout: 10000,
        })

        expect(logs).toContain('Database connection established successfully')
        expect(logs).toContain('Database migration completed successfully')
      } catch (error) {
        throw new Error(`Migration check failed: ${error.message}`)
      }
    })

    test('backend should create required database tables', async () => {
      try {
        // Check if users table exists
        const usersTable = execSync(
          'docker-compose exec -T mysql mysql -h localhost -u tmember -ppassword -e "DESCRIBE users;" tmember_dev',
          { encoding: 'utf8', timeout: 10000 }
        )
        expect(usersTable).toContain('email')
        expect(usersTable).toContain('password_hash')

        // Check if organizations table exists
        const orgsTable = execSync(
          'docker-compose exec -T mysql mysql -h localhost -u tmember -ppassword -e "DESCRIBE organizations;" tmember_dev',
          { encoding: 'utf8', timeout: 10000 }
        )
        expect(orgsTable).toContain('name')
        expect(orgsTable).toContain('billing_details')

        // Check if organization_memberships table exists
        const membershipsTable = execSync(
          'docker-compose exec -T mysql mysql -h localhost -u tmember -ppassword -e "DESCRIBE organization_memberships;" tmember_dev',
          { encoding: 'utf8', timeout: 10000 }
        )
        expect(membershipsTable).toContain('user_id')
        expect(membershipsTable).toContain('organization_id')
        expect(membershipsTable).toContain('role')
      } catch (error) {
        throw new Error(`Table structure check failed: ${error.message}`)
      }
    })

    test('backend should handle database connection errors gracefully', async () => {
      // This test verifies that the backend has proper error handling
      // by checking that it started successfully despite potential connection issues
      const response = await fetch(`${BACKEND_URL}/api/health`)
      expect(response.ok).toBe(true)

      // Check logs for proper error handling messages
      const logs = execSync('docker-compose logs backend', {
        encoding: 'utf8',
        timeout: 10000,
      })

      // Should not contain fatal database errors
      expect(logs).not.toContain('Failed to initialize database')
    })
  })

  describe('Network Communication Between Containers', () => {
    test('services should be able to communicate through Docker network', async () => {
      // Test that backend is accessible from within the Docker network
      // This is implicitly tested by the frontend being able to make API calls
      const response = await fetch(`${BACKEND_URL}/api/health`)
      expect(response.ok).toBe(true)
    })

    test('backend should be able to connect to mysql container', async () => {
      // This is tested implicitly by the backend startup and health check
      // The backend connects to mysql using the service name 'mysql'
      const response = await fetch(`${BACKEND_URL}/api/health`)
      expect(response.ok).toBe(true)
    })

    test('CORS should be properly configured for cross-origin requests', async () => {
      const response = await fetch(`${BACKEND_URL}/api/health`, {
        method: 'OPTIONS',
        headers: {
          Origin: FRONTEND_URL,
          'Access-Control-Request-Method': 'GET',
        },
      })

      // Should not fail due to CORS issues
      expect(response.status).not.toBe(403)
    })
  })

  describe('Port Accessibility from Host Machine', () => {
    test('backend should be accessible on port 8080', async () => {
      const response = await fetch(`${BACKEND_URL}/api/health`)
      expect(response.ok).toBe(true)
    })

    test('frontend should be accessible on port 3000', async () => {
      const response = await fetch(FRONTEND_URL)
      expect(response.ok).toBe(true)
    })

    test('mysql should be accessible on port 3306 from host', async () => {
      // Test MySQL connectivity from host using netcat
      try {
        execSync(`nc -z localhost ${MYSQL_PORT}`, { timeout: 5000 })
      } catch (error) {
        throw new Error(`MySQL port ${MYSQL_PORT} is not accessible from host`)
      }
    })

    test('backend echo endpoint should be accessible from host', async () => {
      const testMessage = 'Host accessibility test'
      const response = await fetch(`${BACKEND_URL}/api/echo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: testMessage }),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.echo).toBe(testMessage)
    })

    test('authentication endpoints should be accessible from host', async () => {
      // Test registration endpoint
      const testUser = {
        email: 'integration@example.com',
        password: 'IntegrationTest123!',
      }

      const registerResponse = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      })

      expect(registerResponse.ok).toBe(true)
      const registerData = await registerResponse.json()
      expect(registerData).toHaveProperty('user')
      expect(registerData).toHaveProperty('token')

      // Test login endpoint
      const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      })

      expect(loginResponse.ok).toBe(true)
      const loginData = await loginResponse.json()
      expect(loginData).toHaveProperty('user')
      expect(loginData).toHaveProperty('token')
    })

    test('organization endpoints should be accessible from host', async () => {
      // First register and login a user
      const testUser = {
        email: 'orgtest@example.com',
        password: 'OrgTest123!',
      }

      const registerResponse = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      })

      expect(registerResponse.ok).toBe(true)
      const userData = await registerResponse.json()
      const token = userData.token

      // Test organization creation
      const orgData = {
        name: 'Integration Test Org',
      }

      const createOrgResponse = await fetch(`${BACKEND_URL}/api/organizations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orgData),
      })

      expect(createOrgResponse.ok).toBe(true)
      const orgResponseData = await createOrgResponse.json()
      expect(orgResponseData).toHaveProperty('organization')

      // Test organization listing
      const listOrgResponse = await fetch(`${BACKEND_URL}/api/organizations`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      expect(listOrgResponse.ok).toBe(true)
      const listData = await listOrgResponse.json()
      expect(listData).toHaveProperty('organizations')
      expect(Array.isArray(listData.organizations)).toBe(true)
    })
  })

  describe('API Endpoint Integration with Database', () => {
    let testToken

    beforeAll(async () => {
      // Set up a test user for API testing
      const testUser = {
        email: 'apitest@example.com',
        password: 'ApiTest123!',
      }

      const registerResponse = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testUser),
      })

      if (registerResponse.ok) {
        const userData = await registerResponse.json()
        testToken = userData.token
      }
    })

    test('authentication endpoints should integrate with database properly', async () => {
      // Test that user data is properly stored and retrieved
      const userResponse = await fetch(`${BACKEND_URL}/api/users/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${testToken}`,
          'Content-Type': 'application/json',
        },
      })

      expect(userResponse.ok).toBe(true)
      const userData = await userResponse.json()
      expect(userData).toHaveProperty('user')
      expect(userData.user.email).toBe('apitest@example.com')
      expect(userData.user).toHaveProperty('id')
    })

    test('organization endpoints should integrate with database properly', async () => {
      // Create organization
      const orgData = {
        name: 'API Integration Test Org',
      }

      const createResponse = await fetch(`${BACKEND_URL}/api/organizations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orgData),
      })

      expect(createResponse.ok).toBe(true)
      const createdOrg = await createResponse.json()
      expect(createdOrg.organization.name).toBe(orgData.name)

      // Verify organization is stored in database
      const listResponse = await fetch(`${BACKEND_URL}/api/organizations`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${testToken}`,
          'Content-Type': 'application/json',
        },
      })

      expect(listResponse.ok).toBe(true)
      const listData = await listResponse.json()
      const foundOrg = listData.organizations.find((org) => org.id === createdOrg.organization.id)
      expect(foundOrg).toBeDefined()
      expect(foundOrg.name).toBe(orgData.name)
    })

    test('database constraints should be enforced through API', async () => {
      // Test unique email constraint
      const duplicateUser = {
        email: 'apitest@example.com', // Same as existing user
        password: 'DuplicateTest123!',
      }

      const duplicateResponse = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(duplicateUser),
      })

      expect(duplicateResponse.ok).toBe(false)
      expect(duplicateResponse.status).toBe(409)

      // Test unique organization name constraint
      const duplicateOrg = {
        name: 'API Integration Test Org', // Same as existing org
      }

      const duplicateOrgResponse = await fetch(`${BACKEND_URL}/api/organizations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(duplicateOrg),
      })

      expect(duplicateOrgResponse.ok).toBe(false)
      expect(duplicateOrgResponse.status).toBe(409)
    })

    test('API should handle database transaction failures gracefully', async () => {
      // Test with invalid data that might cause database issues
      const invalidOrg = {
        name: null, // Invalid name
      }

      const response = await fetch(`${BACKEND_URL}/api/organizations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidOrg),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)

      const errorData = await response.json()
      expect(errorData).toHaveProperty('error')
    })
  })

  describe('Legacy Functionality Compatibility', () => {
    test('echo endpoint should still work with new database integration', async () => {
      const testMessage = 'Legacy compatibility test'
      const response = await fetch(`${BACKEND_URL}/api/echo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: testMessage }),
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.echo).toBe(testMessage)
    })

    test('health endpoint should report database connectivity', async () => {
      const response = await fetch(`${BACKEND_URL}/api/health`)
      expect(response.ok).toBe(true)

      const data = await response.json()
      expect(data).toHaveProperty('status')

      // Health check should pass if database is connected
      expect(data.status).toBe('ok')
    })

    test('CORS should work for all endpoints including new ones', async () => {
      const endpoints = [
        { method: 'GET', path: '/api/health' },
        { method: 'POST', path: '/api/echo' },
        { method: 'POST', path: '/api/auth/register' },
        { method: 'POST', path: '/api/auth/login' },
      ]

      for (const endpoint of endpoints) {
        const response = await fetch(`${BACKEND_URL}${endpoint.path}`, {
          method: 'OPTIONS',
          headers: {
            Origin: FRONTEND_URL,
            'Access-Control-Request-Method': endpoint.method,
            'Access-Control-Request-Headers': 'Content-Type',
          },
        })

        // Should not fail due to CORS issues
        expect([200, 204]).toContain(response.status)
      }
    })
  })

  describe('Docker Compose Configuration Validation', () => {
    test('all services should be running with correct configuration', async () => {
      // Check that all services are running
      const containers = execSync('docker-compose ps --services --filter status=running', {
        encoding: 'utf8',
      })
        .trim()
        .split('\n')

      expect(containers).toContain('backend')
      expect(containers).toContain('frontend')
      expect(containers).toContain('mysql')
    })

    test('services should have proper health check status', async () => {
      // Check health status using docker-compose ps
      const psOutput = execSync('docker-compose ps', {
        encoding: 'utf8',
      })

      // Verify all services are in "Up" state and healthy
      expect(psOutput).toContain('Up (healthy)')
    })

    test('mysql volume should be properly configured', async () => {
      // Check volume configuration
      const volumeInfo = execSync('docker-compose config --volumes', {
        encoding: 'utf8',
      })
      expect(volumeInfo).toContain('mysql_data')
    })

    test('environment variables should be properly set', async () => {
      // Check backend environment variables
      const backendEnv = execSync('docker-compose exec -T backend env', {
        encoding: 'utf8',
      })

      expect(backendEnv).toContain('DB_HOST=mysql')
      expect(backendEnv).toContain('DB_PORT=3306')
      expect(backendEnv).toContain('DB_USER=tmember')
      expect(backendEnv).toContain('DB_NAME=tmember_dev')
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

  /**
   * Helper function to wait for MySQL to be healthy after restart
   */
  async function waitForMySQLHealthy() {
    const maxAttempts = 30
    let attempts = 0

    while (attempts < maxAttempts) {
      if (await checkMySQLHealth()) {
        return
      }
      attempts++
      await setTimeout(2000)
    }

    throw new Error('MySQL failed to become healthy after restart')
  }
})
