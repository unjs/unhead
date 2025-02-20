/// <reference types="vitest" />
/// <reference types="vitest/globals" />
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { svelteTesting } from '@testing-library/svelte/vite'
import { defineProject } from 'vitest/config'

export default defineProject({
  plugins: [svelte(), svelteTesting()],
  test: {
    environment: 'jsdom',
  },
})
