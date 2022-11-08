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
      'unhead': resolve(__dirname, 'packages/unhead/src/index.ts'),
      '@unhead/schema': resolve(__dirname, 'packages/schema/src/index.ts'),
      '@unhead/ssr': resolve(__dirname, 'packages/ssr/src/index.ts'),
      '@unhead/dom': resolve(__dirname, 'packages/dom/src/index.ts'),
      '@unhead/vue': resolve(__dirname, 'packages/vue/src/index.ts'),
    }
  },
  test: {
    include: ['test/**/*.test.ts'],
    globals: true,
    reporters: 'dot',
    isolate: true,
  },
})
