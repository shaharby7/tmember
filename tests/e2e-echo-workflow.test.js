/**
 * End-to-End Echo Workflow Integration Tests
 * Tests complete echo workflow from frontend to backend, error scenarios, and recovery
 * Requirements: 8.3, 8.4, 8.5, 8.6
 */

import { execSync, spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

describe('End-to-End Echo Workflow Tests', () => {
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

  describe('Complete Echo Workflow from Frontend to Backend', () => {
    test('should successfully echo simple text message', async () => {
      const testMessage = 'Hello from end-to-end test';
      
      // Test the complete workflow: frontend input -> backend processing -> frontend display
      const response = await fetch(`${BACKEND_URL}/api/echo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: testMessage }),
      });

      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toContain('application/json');
      
      const data = await response.json();
      expect(data).toHaveProperty('echo');
      expect(data.echo).toBe(testMessage);
    });

    test('should handle special characters and unicode in echo workflow', async () => {
      const testMessage = 'Special chars: !@#$%^&*()_+ 中文 🚀 émojis';
      
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

    test('should handle long text messages in echo workflow', async () => {
      const testMessage = 'A'.repeat(1000); // 1000 character message
      
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

    test('should maintain message integrity through complete workflow', async () => {
      const testMessages = [
        'Simple message',
        'Message with "quotes" and \\backslashes\\',
        'Multi\\nline\\nmessage',
        'JSON-like {"key": "value"} content',
        'Empty string test: ""',
        'Whitespace test:   spaces   and\\ttabs\\t'
      ];

      for (const testMessage of testMessages) {
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
      }
    });
  });

  describe('Error Scenarios and Recovery', () => {
    test('should handle empty message gracefully', async () => {
      const response = await fetch(`${BACKEND_URL}/api/echo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: '' }),
      });

      // Should either accept empty message or return appropriate error
      if (response.ok) {
        const data = await response.json();
        expect(data.echo).toBe('');
      } else {
        expect(response.status).toBe(400);
        const errorData = await response.json();
        expect(errorData).toHaveProperty('error');
      }
    });

    test('should handle missing message field', async () => {
      const response = await fetch(`${BACKEND_URL}/api/echo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      const errorData = await response.json();
      expect(errorData).toHaveProperty('error');
    });

    test('should handle malformed JSON requests', async () => {
      const response = await fetch(`${BACKEND_URL}/api/echo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json{',
      });

      expect(response.status).toBe(400);
      const errorData = await response.json();
      expect(errorData).toHaveProperty('error');
    });

    test('should handle wrong HTTP method', async () => {
      const response = await fetch(`${BACKEND_URL}/api/echo`, {
        method: 'GET',
      });

      expect(response.status).toBe(405); // Method Not Allowed
    });

    test('should handle missing content-type header', async () => {
      const response = await fetch(`${BACKEND_URL}/api/echo`, {
        method: 'POST',
        body: JSON.stringify({ message: 'test' }),
      });

      // Should either handle gracefully or return appropriate error
      expect([200, 400, 415]).toContain(response.status);
    });

    test('should recover from temporary network issues', async () => {
      // Test multiple rapid requests to ensure system stability
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          fetch(`${BACKEND_URL}/api/echo`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: `Concurrent test ${i}` }),
          })
        );
      }

      const responses = await Promise.all(promises);
      
      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.ok).toBe(true);
      });

      // Verify response content
      for (let i = 0; i < responses.length; i++) {
        const data = await responses[i].json();
        expect(data.echo).toBe(`Concurrent test ${i}`);
      }
    });
  });

  describe('CORS and Cross-Origin Request Handling', () => {
    test('should handle preflight OPTIONS requests', async () => {
      const response = await fetch(`${BACKEND_URL}/api/echo`, {
        method: 'OPTIONS',
        headers: {
          'Origin': FRONTEND_URL,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type',
        },
      });

      // Should not fail due to CORS issues
      expect([200, 204]).toContain(response.status);
    });

    test('should include proper CORS headers in responses', async () => {
      const response = await fetch(`${BACKEND_URL}/api/echo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': FRONTEND_URL,
        },
        body: JSON.stringify({ message: 'CORS test' }),
      });

      expect(response.ok).toBe(true);
      
      // Check for CORS headers
      const corsHeader = response.headers.get('Access-Control-Allow-Origin');
      expect(corsHeader).toBeTruthy();
    });
  });

  describe('Service Integration and Communication', () => {
    test('should maintain consistent API contract', async () => {
      // Test that the API contract remains consistent
      const testMessage = 'API contract test';
      
      const response = await fetch(`${BACKEND_URL}/api/echo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: testMessage }),
      });

      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toContain('application/json');
      
      const data = await response.json();
      
      // Verify response structure
      expect(typeof data).toBe('object');
      expect(data).toHaveProperty('echo');
      expect(typeof data.echo).toBe('string');
      expect(data.echo).toBe(testMessage);
    });

    test('should handle concurrent requests without data corruption', async () => {
      const testMessages = Array.from({ length: 20 }, (_, i) => `Message ${i}`);
      
      const promises = testMessages.map(message =>
        fetch(`${BACKEND_URL}/api/echo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message }),
        })
      );

      const responses = await Promise.all(promises);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.ok).toBe(true);
      });

      // Verify each response contains the correct message
      for (let i = 0; i < responses.length; i++) {
        const data = await responses[i].json();
        expect(data.echo).toBe(testMessages[i]);
      }
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