import { resolve } from 'node:path'
/// <reference types="vitest" />
/// <reference types="vitest/globals" />
import { defineProject } from 'vitest/config'

export default defineProject({
  resolve: {
    alias: {
      '@unhead/dom': resolve(__dirname, 'src/client'),
      '@unhead/ssr': resolve(__dirname, '../unhead/src/server/index.ts'),
      '@unhead/addons': resolve(__dirname, '../addons/src'),
      '@unhead/schema-org/vue': resolve(__dirname, '../schema-org/src/vue/index.ts'),
      '@unhead/vue/server': resolve(__dirname, 'src/server.ts'),
      '@unhead/vue/client': resolve(__dirname, 'src/client.ts'),
      '@unhead/vue': resolve(__dirname, 'src/index.ts'),
      'unhead/stream/server': resolve(__dirname, '../unhead/src/stream/server.ts'),
      'unhead/stream/client': resolve(__dirname, '../unhead/src/stream/client.ts'),
      'unhead/stream/vite': resolve(__dirname, '../unhead/src/stream/vite.ts'),
      'unhead/stream/iife': resolve(__dirname, '../unhead/src/stream/iife.ts'),
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
