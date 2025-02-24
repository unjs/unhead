import { resolve } from 'node:path'
/// <reference types="vitest" />
/// <reference types="vitest/globals" />
import { defineProject } from 'vitest/config'

export default defineProject({
  resolve: {
    alias: {
      '@unhead/dom': resolve(__dirname, 'src/client'),
      '@unhead/ssr': resolve(__dirname, 'src/server'),
    },
  },
  test: {
    globals: true,
  },
})
