import { resolve } from 'node:path'
/// <reference types="vitest" />
/// <reference types="vitest/globals" />
import { defineProject } from 'vitest/config'

export default defineProject({
  resolve: {
    alias: {
      '@unhead/ssr': resolve(__dirname, '../unhead/src/server'),
      '@unhead/dom': resolve(__dirname, '../unhead/src/client'),
      '@unhead/schema-org/vue': resolve(__dirname, 'src/vue/index.ts'),
      '@unhead/schema-org': resolve(__dirname, 'src/index.ts'),
      '@unhead/vue/server': resolve(__dirname, '../vue/src/server.ts'),
      '@unhead/vue/client': resolve(__dirname, '../vue/src/client.ts'),
      '@unhead/vue': resolve(__dirname, '../vue/src/index.ts'),
      'unhead/server': resolve(__dirname, '../unhead/src/server/index.ts'),
      'unhead/client': resolve(__dirname, '../unhead/src/client/index.ts'),
      'unhead/types': resolve(__dirname, '../unhead/src/types/index.ts'),
      'unhead/plugins': resolve(__dirname, '../unhead/src/plugins/index.ts'),
      'unhead/utils': resolve(__dirname, '../unhead/src/utils/index.ts'),
      'unhead/scripts': resolve(__dirname, '../unhead/src/scripts/index.ts'),
      'unhead/parser': resolve(__dirname, '../unhead/src/parser/index.ts'),
      'unhead/legacy': resolve(__dirname, '../unhead/src/legacy.ts'),
      'unhead': resolve(__dirname, '../unhead/src/index.ts'),
    },
  },
  test: {
    globals: true,
  },
})
