import { defineConfig } from 'vitest/config'

// Standalone config: this example is not part of the root workspace's
// `projects` list (packages/*, test/, bench/), so its unit tests (the
// recording/hash/manifest/scanner logic in module/) run via `pnpm test`
// here, separate from `nuxt build` (the integration proof).
export default defineConfig({
  test: {
    include: ['module/**/*.test.ts'],
    reporters: 'dot',
  },
})
