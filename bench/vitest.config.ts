import { resolve } from 'node:path'
import { defineProject } from 'vitest/config'

export default defineProject({
  resolve: {
    alias: {
      'unhead/utils': resolve(__dirname, '../packages/unhead/src/utils'),
      'unhead/server': resolve(__dirname, '../packages/unhead/src/server'),
      'unhead/types': resolve(__dirname, '../packages/unhead/src/types'),
      'unhead': resolve(__dirname, '../packages/unhead/src'),
      '@unhead/bundler': resolve(__dirname, '../packages/bundler/src'),
      '@unhead/schema-org': resolve(__dirname, '../packages/schema-org/src'),
      '@unhead/vue': resolve(__dirname, '../packages/vue/src'),
    },
  },
  test: {
    globals: true,
    benchmark: {
      include: ['**/*.bench.ts'],
    },
  },
})
