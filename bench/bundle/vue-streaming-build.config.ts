import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { defineBuildConfig } from 'unbuild'
// eslint-disable-next-line antfu/no-import-dist -- Measure the script emitted by the package build.
import * as bootstrap from '../../packages/unhead/dist/stream/iife.mjs'

const packagesDir = resolve(__dirname, '../../packages')
const outDir = 'dist/streaming'

export default defineBuildConfig({
  entries: [{ input: 'src/streaming/vue-client', name: 'vue-client' }],
  outDir,
  clean: true,
  declaration: false,
  externals: ['hookable', 'vue'],
  rollup: {
    inlineDependencies: true,
    esbuild: {
      treeShaking: true,
      minify: true,
    },
    alias: {
      entries: [
        { find: '@unhead/vue/stream/client', replacement: resolve(packagesDir, 'vue/dist/stream/client.mjs') },
        { find: 'unhead/stream/client', replacement: resolve(packagesDir, 'unhead/dist/stream/client.mjs') },
      ],
    },
  },
  hooks: {
    'build:done': async ({ options }) => {
      // Copy the exact script bytes an SSR renderer sends to the browser.
      await writeFile(resolve(options.outDir, 'bootstrap.js'), bootstrap.streamingIifeCode)
      if ('streamingIifeCodeWithDeferredEvents' in bootstrap && typeof bootstrap.streamingIifeCodeWithDeferredEvents === 'string')
        await writeFile(resolve(options.outDir, 'bootstrap-deferred-events.js'), bootstrap.streamingIifeCodeWithDeferredEvents)
    },
  },
})
