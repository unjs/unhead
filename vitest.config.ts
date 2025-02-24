/// <reference types="vitest" />
/// <reference types="vitest/globals" />

import { defineConfig } from 'vite'

export default defineConfig({
  define: {
    __DEV__: true,
    __TEST__: true,
    __BROWSER__: true,
  },
  test: {
    pool: 'threads',
    workspace: ['packages/*'],
    globals: true,
    reporters: 'dot',
    isolate: true,
  },
})
