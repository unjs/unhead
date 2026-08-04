/// <reference types="vitest" />
/// <reference types="vitest/globals" />
import { defineProject } from 'vitest/config'

export default defineProject({
  resolve: {
    conditions: ['development', 'browser'],
  },
  test: {
    globals: true,
  },
})
