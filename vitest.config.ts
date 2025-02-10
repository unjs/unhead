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
      '@unhead/ssr': resolve(__dirname, 'package-aliases/ssr/src'),
      '@unhead/addons': resolve(__dirname, 'packages/addons/src'),
      '@unhead/dom': resolve(__dirname, 'package-aliases/dom/src'),
      '@unhead/vue': resolve(__dirname, 'packages/vue/src'),
    },
  },
  test: {
    // include: ['test/**/*.test.ts'],
    globals: true,
    reporters: 'dot',
    isolate: true,
  },
})
