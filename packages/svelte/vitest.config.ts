/// <reference types="vitest" />
/// <reference types="vitest/globals" />
import { defineProject } from 'vitest/config'

// Note: svelte() and svelteTesting() plugins removed to fix magic-string resolution
// The vite-plugin.test.ts doesn't need svelte processing
export default defineProject({
  test: {
    globals: true,
  },
})
