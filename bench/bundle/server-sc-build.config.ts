import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineBuildConfig } from 'unbuild'

const packagesDir = path.resolve(__dirname, '../../packages')

// Self-contained variant of server-build.config.ts: `hookable` is inlined instead of
// externalized so the number reflects the true cost of shipping this bundle standalone,
// not gameable by moving deps around.
export default defineBuildConfig({
  entries: [
    'src/server/minimal',
  ],
  outDir: 'dist/server-sc',
  failOnWarn: false,
  rollup: {
    inlineDependencies: true,
    esbuild: {
      treeShaking: true,
      minify: true,
    },
    alias: {
      entries: [
        { find: 'unhead/server', replacement: path.join(packagesDir, 'unhead/dist/server.mjs') },
        { find: 'unhead', replacement: path.join(packagesDir, 'unhead/dist/index.mjs') },
      ],
    },
  },
  declaration: false,
  hooks: {
    'rollup:options': (ctx, config) => {
      config.plugins.push(visualizer({
        emitFile: true,
        filename: 'stats.html',
      }))
    },
    'build:done': () => {
      const file = path.resolve(__dirname, 'dist/server-sc/server/minimal.mjs')
      const contents = fs.readFileSync(file)
      const size = contents.length
      const compressed = zlib.gzipSync(contents).length
      console.log(`SERVER (self-contained) Size: ${Math.round(size / 102.4) / 10} kB (gzipped: ${Math.round(compressed / 102.4) / 10} kB)`)
    },
  },
})
