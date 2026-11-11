import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineBuildConfig } from 'unbuild'

const packagesDir = path.resolve(__dirname, '../../packages')

export default defineBuildConfig({
  entries: [
    'src/server-compiled/minimal',
  ],
  outDir: 'dist/server-compiled',
  failOnWarn: false,
  rollup: {
    inlineDependencies: true,
    esbuild: {
      treeShaking: true,
      minify: true,
    },
    alias: {
      entries: [
        { find: 'unhead/compiled/server', replacement: path.join(packagesDir, 'unhead/dist/compiled/server.mjs') },
        { find: 'unhead/server', replacement: path.join(packagesDir, 'unhead/dist/server.mjs') },
        { find: 'unhead', replacement: path.join(packagesDir, 'unhead/dist/index.mjs') },
      ],
    },
  },
  externals: [
    'hookable',
  ],
  declaration: false,
  hooks: {
    'rollup:options': (ctx, config) => {
      config.plugins.push(visualizer({
        emitFile: true,
        filename: 'stats.html',
      }))
    },
    'build:done': () => {
      // check gzip size of ./dist/minimal.mjs
      const file = path.resolve(__dirname, 'dist/server-compiled/server-compiled/minimal.mjs')
      const contents = fs.readFileSync(file)
      const size = contents.length
      const compressed = zlib.gzipSync(contents).length
      // show as kB size instead of bytes
      // round to 1 decimal place
      console.log(`SERVER COMPILED Size: ${Math.round(size / 102.4) / 10} kB (gzipped: ${Math.round(compressed / 102.4) / 10} kB)`)
    },
  },
})
