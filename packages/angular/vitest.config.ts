import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.spec.ts'],
    deps: {
      inline: ['@angular/core', '@angular/common', '@angular/platform-browser', 'zone.js'],
    },
  },
})
