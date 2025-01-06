/// <reference types="vitest" />
/// <reference types="vitest/globals" />

import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  define: {
    __DEV__: true,
    __TEST__: true,
    __BROWSER__: true,
  },
  resolve: {
    alias: {
      'unhead': resolve(__dirname, 'packages/unhead/src'),
      '@unhead/shared': resolve(__dirname, 'packages/shared/src'),
      '@unhead/schema': resolve(__dirname, 'packages/schema/src'),
      '@unhead/ssr': resolve(__dirname, 'packages/ssr/src'),
      '@unhead/addons': resolve(__dirname, 'packages/addons/src'),
      '@unhead/dom': resolve(__dirname, 'packages/dom/src'),
      '@unhead/vue': resolve(__dirname, 'packages/vue/src'),
      '@unhead/schema-org': resolve(__dirname, 'packages/schema-org/src'),
    },
  },
  test: {
    // include: ['test/**/*.test.ts'],
    globals: true,
    reporters: 'dot',
    isolate: true,
  },
})
