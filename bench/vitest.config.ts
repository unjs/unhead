import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { defineProject } from 'vitest/config'

// @vue/shared is not hoisted to the workspace root; resolve it through vue's
// own node_modules so v4-explore/vue-native can import the exact copy vue uses
const require = createRequire(import.meta.url)
const vueSharedPath = createRequire(require.resolve('vue')).resolve('@vue/shared')

export default defineProject({
  resolve: {
    alias: {
      '@vue/shared': vueSharedPath,
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
