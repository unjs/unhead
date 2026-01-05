import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5175/',
  },
  webServer: {
    command: 'node server.js',
    port: 5175,
    reuseExistingServer: !process.env.CI,
  },
})
