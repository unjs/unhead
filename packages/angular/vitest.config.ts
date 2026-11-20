import { resolve } from 'node:path'
import { defineProject } from 'vitest/config'

export default defineProject({
  resolve: {
    alias: {
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
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.spec.ts'],
    exclude: ['**/head.component.spec.ts'], // Temporarily exclude due to Angular DI circular dependency issue
    server: {
      deps: {
        inline: ['@angular/core', '@angular/common', '@angular/platform-browser', 'zone.js'],
      },
    },
  },
})
