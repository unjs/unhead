import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: {
    timeout: 20000,
  },
  use: {
    baseURL: 'http://localhost:6174',
  },
  webServer: {
    command: 'node server.js',
    port: 6174,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
})
