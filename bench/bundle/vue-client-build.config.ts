import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/vue-client/minimal',
  ],
  outDir: 'dist/vue-client',
  failOnWarn: false,
  rollup: {
    inlineDependencies: true,
    esbuild: {
      treeShaking: true,
      minify: true,
    },
    output: {
      chunkFileNames: 'vue-client/[name].js',
      entryFileNames: 'vue-client/[name].js',
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
      // check gzip size of ./dist/minimal.js
      const file = path.resolve(__dirname, 'dist/vue-client/vue-client/minimal.js')
      const contents = fs.readFileSync(file)
      const size = contents.length
      const compressed = zlib.gzipSync(contents).length
      // show as kB size instead of bytes
      // round to 1 decimal place
      console.log(`VUE CLIENT Size: ${Math.round(size / 102.4) / 10} kB (gzipped: ${Math.round(compressed / 102.4) / 10} kB)`)
    },
  },
})
