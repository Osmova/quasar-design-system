import { defineConfig } from '@playwright/test'

// Built production outputs only. No reused or externally managed servers.
export default defineConfig({
  testDir: './tests',
  testMatch: 'proof.spec.ts',
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    browserName: 'chromium',
    viewport: { width: 1280, height: 900 },
    colorScheme: 'light',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'python3 -u -m http.server 6196 --bind 127.0.0.1 --directory ../../.histoire/dist',
      wait: { stdout: /Serving HTTP on 127\.0\.0\.1 port 6196/ },
      timeout: 15_000,
      reuseExistingServer: false,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
    },
    {
      command: 'python3 -u -m http.server 6197 --bind 127.0.0.1 --directory storybook-static',
      wait: { stdout: /Serving HTTP on 127\.0\.0\.1 port 6197/ },
      timeout: 15_000,
      reuseExistingServer: false,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
    },
  ],
})
