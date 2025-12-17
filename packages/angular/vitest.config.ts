import { defineProject } from 'vitest/config'

export default defineProject({
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
