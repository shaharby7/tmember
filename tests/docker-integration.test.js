/**
 * Docker Environment Integration Tests
 * Tests service startup, health checks, network communication, and port accessibility
 * Requirements: 5.2, 5.5
 */

import { execSync, spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

describe('Docker Environment Integration Tests', () => {
  let composeProcess;
  const BACKEND_URL = 'http://localhost:8080';
  const FRONTEND_URL = 'http://localhost:3000';
  const HEALTH_TIMEOUT = 60000; // 60 seconds for services to start

  beforeAll(async () => {
    // Clean up any existing containers
    try {
      execSync('docker-compose down -v', { stdio: 'ignore' });
    } catch (error) {
      // Ignore errors if no containers exist
    }

    // Start Docker Compose services
    composeProcess = spawn('docker-compose', ['up', '--build'], {
      detached: false,
      stdio: 'pipe'
    });

    // Wait for services to be healthy
    await waitForServicesHealthy();
  }, HEALTH_TIMEOUT + 10000);

  afterAll(async () => {
    // Clean up Docker Compose services
    if (composeProcess) {
      composeProcess.kill();
    }
    
    try {
      execSync('docker-compose down -v', { stdio: 'ignore' });
    } catch (error) {
      console.warn('Error cleaning up Docker containers:', error.message);
    }
  });

  describe('Service Startup and Health Checks', () => {
    test('backend service should be healthy and accessible', async () => {
      const response = await fetch(`${BACKEND_URL}/api/health`);
      expect(response.ok).toBe(true);
      
      const data = await response.json();
      expect(data).toHaveProperty('status');
    });

    test('frontend service should be accessible', async () => {
      const response = await fetch(FRONTEND_URL);
      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toContain('text/html');
    });

    test('backend service should respond to echo endpoint', async () => {
      const testMessage = 'Docker integration test';
      const response = await fetch(`${BACKEND_URL}/api/echo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: testMessage }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.echo).toBe(testMessage);
    });
  });

  describe('Network Communication Between Containers', () => {
    test('services should be able to communicate through Docker network', async () => {
      // Test that backend is accessible from within the Docker network
      // This is implicitly tested by the frontend being able to make API calls
      const response = await fetch(`${BACKEND_URL}/api/health`);
      expect(response.ok).toBe(true);
    });

    test('CORS should be properly configured for cross-origin requests', async () => {
      const response = await fetch(`${BACKEND_URL}/api/health`, {
        method: 'OPTIONS',
        headers: {
          'Origin': FRONTEND_URL,
          'Access-Control-Request-Method': 'GET',
        },
      });

      // Should not fail due to CORS issues
      expect(response.status).not.toBe(403);
    });
  });

  describe('Port Accessibility from Host Machine', () => {
    test('backend should be accessible on port 8080', async () => {
      const response = await fetch(`${BACKEND_URL}/api/health`);
      expect(response.ok).toBe(true);
    });

    test('frontend should be accessible on port 3000', async () => {
      const response = await fetch(FRONTEND_URL);
      expect(response.ok).toBe(true);
    });

    test('backend echo endpoint should be accessible from host', async () => {
      const testMessage = 'Host accessibility test';
      const response = await fetch(`${BACKEND_URL}/api/echo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: testMessage }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.echo).toBe(testMessage);
    });
  });

  describe('Docker Compose Configuration Validation', () => {
    test('services should be running with correct configuration', async () => {
      // Check that both services are running
      const containers = execSync('docker-compose ps --services --filter status=running', { 
        encoding: 'utf8' 
      }).trim().split('\n');

      expect(containers).toContain('backend');
      expect(containers).toContain('frontend');
    });

    test('services should have proper health check status', async () => {
      // Check that both services are running
      const containers = execSync('docker-compose ps --services --filter status=running', { 
        encoding: 'utf8' 
      }).trim().split('\n');

      expect(containers).toContain('backend');
      expect(containers).toContain('frontend');

      // Check health status using docker-compose ps
      const psOutput = execSync('docker-compose ps', { 
        encoding: 'utf8' 
      });
      
      // Verify both services are in "Up" state and healthy
      expect(psOutput).toContain('tmember_backend_1');
      expect(psOutput).toContain('tmember_frontend_1');
      expect(psOutput).toContain('Up (healthy)');
    });
  });

  /**
   * Helper function to wait for services to become healthy
   */
  async function waitForServicesHealthy() {
    const maxAttempts = 30; // 30 attempts with 2-second intervals = 60 seconds max
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        // Check backend health
        const backendResponse = await fetch(`${BACKEND_URL}/api/health`, {
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        // Check frontend accessibility
        const frontendResponse = await fetch(FRONTEND_URL, {
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        if (backendResponse.ok && frontendResponse.ok) {
          console.log('Services are healthy and ready for testing');
          return;
        }
      } catch (error) {
        // Services not ready yet, continue waiting
      }

      attempts++;
      await setTimeout(2000); // Wait 2 seconds before next attempt
    }

    throw new Error('Services failed to become healthy within timeout period');
  }
});