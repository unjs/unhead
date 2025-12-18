import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:6174',
  },
  webServer: {
    command: 'node server.js',
    port: 6174,
    reuseExistingServer: !process.env.CI,
  },
})
