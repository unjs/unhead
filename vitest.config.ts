/* eslint-disable spaced-comment */
/// <reference types="vitest" />
/// <reference types="vitest/globals" />

import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  define: {
    __DEV__: true,
    __TEST__: true,
    __BROWSER__: true,
  },
  resolve: {
    alias: {
      'unhead': resolve(__dirname, 'packages/unhead/src'),
      '@unhead/schema': resolve(__dirname, 'packages/schema/src'),
      '@unhead/ssr': resolve(__dirname, 'packages/ssr/src'),
      '@unhead/dom': resolve(__dirname, 'packages/dom/src'),
      '@unhead/vue': resolve(__dirname, 'packages/vue/src'),
    }
  },
  test: {
    include: ['test/**/*.test.ts'],
    globals: true,
    reporters: 'dot',
    isolate: true,
  },
})
