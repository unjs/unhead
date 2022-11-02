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
      '#head-runtime': resolve(__dirname, 'packages/vue/src/runtime/client'),
    }
  },
  test: {
    include: ['test/**/*.test.ts'],
    globals: true,
    reporters: 'dot',
    isolate: true,
  },
})
