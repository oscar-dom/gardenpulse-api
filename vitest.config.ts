import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 10000,
    include: ["tests/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      // Test-only values so src/config/env.ts loads; tests use an in-memory database.
      MONGODB_URI: "mongodb://localhost:27017/gardenpulse-test",
      JWT_SECRET: "test-secret-that-is-at-least-32-characters-long",
      JWT_EXPIRES_IN: "1h",
    },
  },
});
