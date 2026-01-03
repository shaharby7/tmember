import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 120000, // 2 minutes for Docker integration tests
    hookTimeout: 120000, // 2 minutes for setup/teardown
    globals: true,
    environment: 'node',
  },
});