/// <reference types="vitest" />
/// <reference types="vitest/globals" />
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineProject } from 'vitest/config'

export default defineProject({
  plugins: [svelte() as any],
  resolve: {
    conditions: ['browser'],
  },
  test: {
    globals: true,
  },
})
