import { resolve } from 'node:path'
/// <reference types="vitest" />
/// <reference types="vitest/globals" />
import { defineProject } from 'vitest/config'

export default defineProject({
  resolve: {
    alias: {
      '@unhead/ssr': resolve(__dirname, 'src/server'),
      '@unhead/dom': resolve(__dirname, 'src/client'),
      'unhead/server': resolve(__dirname, 'src/server/index.ts'),
      'unhead/client': resolve(__dirname, 'src/client/index.ts'),
      'unhead/types': resolve(__dirname, 'src/types/index.ts'),
      'unhead/plugins': resolve(__dirname, 'src/plugins/index.ts'),
      'unhead/utils': resolve(__dirname, 'src/utils/index.ts'),
      'unhead/scripts': resolve(__dirname, 'src/scripts/index.ts'),
      'unhead/parser': resolve(__dirname, 'src/parser/index.ts'),
      'unhead/legacy': resolve(__dirname, 'src/legacy.ts'),
      'unhead': resolve(__dirname, 'src/index.ts'),
    },
  },
  test: {
    globals: true,
  },
})
