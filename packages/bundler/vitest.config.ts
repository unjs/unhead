import { resolve } from 'node:path'
import { defineProject } from 'vitest/config'

export default defineProject({
  resolve: {
    alias: {
      'unhead/minify': resolve(__dirname, '../unhead/src/minify/index.ts'),
      'unhead/compiled/compile': resolve(__dirname, '../unhead/src/compiled/compile.ts'),
      'unhead/utils': resolve(__dirname, '../unhead/src/utils/index.ts'),
    },
  },
  test: {
    globals: true,
  },
})
