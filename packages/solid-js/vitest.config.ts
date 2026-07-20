import { resolve } from 'node:path'
/// <reference types="vitest" />
/// <reference types="vitest/globals" />
import { defineProject } from 'vitest/config'

export default defineProject({
  resolve: {
    // resolve solid-js to its client build so the client composable path runs in tests
    conditions: ['browser'],
    alias: {
      '@unhead/bundler/framework': resolve(__dirname, '../bundler/src/unplugin/framework.ts'),
      '@unhead/bundler': resolve(__dirname, '../bundler/src'),
      '@unhead/solid-js/server': resolve(__dirname, 'src/server.ts'),
      '@unhead/solid-js/client': resolve(__dirname, 'src/client.ts'),
      '@unhead/solid-js': resolve(__dirname, 'src/index.ts'),
      'unhead/stream/server': resolve(__dirname, '../unhead/src/stream/server.ts'),
      'unhead/stream/client': resolve(__dirname, '../unhead/src/stream/client.ts'),
      'unhead/stream/unplugin': resolve(__dirname, '../unhead/src/stream/unplugin.ts'),
      'unhead/precompiled/client': resolve(__dirname, '../unhead/src/precompiled/client.ts'),
      'unhead/precompiled/client-csr': resolve(__dirname, '../unhead/src/precompiled/client-csr.ts'),
      'unhead/precompiled/client-deferred': resolve(__dirname, '../unhead/src/precompiled/client-deferred.ts'),
      'unhead/precompiled/server': resolve(__dirname, '../unhead/src/precompiled/server.ts'),
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
