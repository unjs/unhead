import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineBuildConfig } from 'unbuild'

const packagesDir = path.resolve(__dirname, '../../packages')

export default defineBuildConfig({
  entries: [
    'src/vue-client/compiled-params',
  ],
  outDir: 'dist/vue-client-compiled-params',
  failOnWarn: false,
  rollup: {
    inlineDependencies: true,
    esbuild: {
      treeShaking: true,
      minify: true,
    },
    // a compile build without `debug`, so the debug code of compiler mode drops as in an app
    replace: {
      preventAssignment: true,
      values: { __UNHEAD_COMPILE_DEBUG__: 'false' },
    },
    alias: {
      entries: [
        { find: '@unhead/vue/compiled', replacement: path.join(packagesDir, 'vue/dist/compiled.mjs') },
        { find: '@unhead/vue/lazy', replacement: path.join(packagesDir, 'vue/dist/lazy.mjs') },
        { find: 'unhead/lazy', replacement: path.join(packagesDir, 'unhead/dist/lazy.mjs') },
        { find: '@unhead/vue/client', replacement: path.join(packagesDir, 'vue/dist/client.mjs') },
        { find: '@unhead/vue', replacement: path.join(packagesDir, 'vue/dist/index.mjs') },
        { find: 'unhead/client', replacement: path.join(packagesDir, 'unhead/dist/client.mjs') },
        { find: 'unhead/server', replacement: path.join(packagesDir, 'unhead/dist/server.mjs') },
        { find: 'unhead/plugins', replacement: path.join(packagesDir, 'unhead/dist/plugins.mjs') },
        { find: 'unhead/scripts', replacement: path.join(packagesDir, 'unhead/dist/scripts.mjs') },
        { find: 'unhead/utils', replacement: path.join(packagesDir, 'unhead/dist/utils.mjs') },
        { find: 'unhead', replacement: path.join(packagesDir, 'unhead/dist/index.mjs') },
      ],
    },
  },
  externals: [
    'hookable',
    'vue',
  ],
  declaration: false,
  hooks: {
    'rollup:options': (ctx, config) => {
      config.experimentalLogSideEffects = true
      config.plugins.push(visualizer({
        emitFile: true,
        filename: 'stats.html',
      }))
    },
    'build:done': () => {
      const file = path.resolve(__dirname, 'dist/vue-client-compiled-params/vue-client/compiled-params.mjs')
      const contents = fs.readFileSync(file)
      const size = contents.length
      const compressed = zlib.gzipSync(contents).length
      console.log(`VUE CLIENT COMPILED PARAMS Size (eager): ${Math.round(size / 102.4) / 10} kB (gzipped: ${Math.round(compressed / 102.4) / 10} kB)`)
    },
  },
})
