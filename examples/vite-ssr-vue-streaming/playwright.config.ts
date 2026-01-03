import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:6173',
  },
  webServer: {
    command: 'node server.js',
    port: 6173,
    reuseExistingServer: !process.env.CI,
  },
})
