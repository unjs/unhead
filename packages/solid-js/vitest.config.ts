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
      '@unhead/solid-js/lazy': resolve(__dirname, 'src/lazy.ts'),
      '@unhead/solid-js/server': resolve(__dirname, 'src/server.ts'),
      '@unhead/solid-js/client': resolve(__dirname, 'src/client.ts'),
      '@unhead/solid-js': resolve(__dirname, 'src/index.ts'),
      'unhead/stream/server': resolve(__dirname, '../unhead/src/stream/server.ts'),
      'unhead/stream/client': resolve(__dirname, '../unhead/src/stream/client.ts'),
      'unhead/stream/unplugin': resolve(__dirname, '../unhead/src/stream/unplugin.ts'),
      'unhead/lazy': resolve(__dirname, '../unhead/src/lazy/index.ts'),
      'unhead/server': resolve(__dirname, '../unhead/src/server/index.ts'),
      'unhead/client': resolve(__dirname, '../unhead/src/client/index.ts'),
      'unhead/minify': resolve(__dirname, '../unhead/src/minify/index.ts'),
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
    // Node would load solid-js/web with its own conditions, and its import of solid-js would
    // then reach the server build. Inline it, so both resolve to the client build.
    server: { deps: { inline: [/[\\/]solid-js[\\/]/] } },
  },
})
