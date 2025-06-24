/// <reference types="vitest/globals" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    __DEV__: true,
    __TEST__: true,
    __BROWSER__: true,
  },
  test: {
    pool: 'threads',
    projects: ['packages/*', 'test/'],
    globals: true,
    reporters: 'dot',
    isolate: true,
  },
})
