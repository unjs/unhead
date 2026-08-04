import { resolve } from 'node:path'
/// <reference types="vitest" />
/// <reference types="vitest/globals" />
import { defineProject } from 'vitest/config'

export default defineProject({
  resolve: {
    alias: {
      '@unhead/dom': resolve(__dirname, 'src/client'),
      '@unhead/ssr': resolve(__dirname, '../unhead/src/server/index.ts'),
      '@unhead/bundler/framework': resolve(__dirname, '../bundler/src/unplugin/framework.ts'),
      '@unhead/bundler': resolve(__dirname, '../bundler/src'),
      '@unhead/schema-org/vue': resolve(__dirname, '../schema-org/src/vue/index.ts'),
      '@unhead/vue/server': resolve(__dirname, 'src/server.ts'),
      '@unhead/vue/client': resolve(__dirname, 'src/client.ts'),
      '@unhead/vue': resolve(__dirname, 'src/index.ts'),
      'unhead/v4/emit': resolve(__dirname, '../unhead/src/v4/emit.ts'),
      'unhead/v4/server-compiled': resolve(__dirname, '../unhead/src/v4/server-compiled.ts'),
      'unhead/v4/server': resolve(__dirname, '../unhead/src/v4/server.ts'),
      'unhead/v4/client-plans': resolve(__dirname, '../unhead/src/v4/client-plans.ts'),
      'unhead/v4/client-compiled': resolve(__dirname, '../unhead/src/v4/client-compiled.ts'),
      'unhead/v4/client': resolve(__dirname, '../unhead/src/v4/client.ts'),
      'unhead/v4/compile': resolve(__dirname, '../unhead/src/v4/compile.ts'),
      'unhead/v4/plugins': resolve(__dirname, '../unhead/src/v4/plugins.ts'),
      'unhead/v4/seo': resolve(__dirname, '../unhead/src/v4/seo.ts'),
      'unhead/v4': resolve(__dirname, '../unhead/src/v4/index.ts'),
      'unhead/stream/server': resolve(__dirname, '../unhead/src/stream/server.ts'),
      'unhead/stream/client': resolve(__dirname, '../unhead/src/stream/client.ts'),
      'unhead/stream/unplugin': resolve(__dirname, '../unhead/src/stream/unplugin.ts'),
      'unhead/stream/iife': resolve(__dirname, '../unhead/src/stream/iife.ts'),
      'unhead/server': resolve(__dirname, '../unhead/src/server/index.ts'),
      'unhead/client': resolve(__dirname, '../unhead/src/client/index.ts'),
      'unhead/minify': resolve(__dirname, '../unhead/src/minify/index.ts'),
      'unhead/types': resolve(__dirname, '../unhead/src/types/index.ts'),
      'unhead/plugins': resolve(__dirname, '../unhead/src/plugins/index.ts'),
      'unhead/utils': resolve(__dirname, '../unhead/src/utils/index.ts'),
      'unhead/scripts': resolve(__dirname, '../unhead/src/scripts/index.ts'),
      'unhead/parser': resolve(__dirname, '../unhead/src/parser/index.ts'),
      'unhead/legacy': resolve(__dirname, '../unhead/src/legacy/index.ts'),
      'unhead': resolve(__dirname, '../unhead/src/index.ts'),
    },
  },
  test: {
    globals: true,
  },
})
