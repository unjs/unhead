import { resolve } from 'node:path'
import { defineProject } from 'vitest/config'

export default defineProject({
  resolve: {
    alias: {
      'unhead/minify': resolve(__dirname, '../unhead/src/minify/index.ts'),
    },
  },
  test: {
    globals: true,
  },
})
