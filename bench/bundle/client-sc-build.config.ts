import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineBuildConfig } from 'unbuild'

const packagesDir = path.resolve(__dirname, '../../packages')

// Self-contained variant of client-build.config.ts: `hookable` is inlined instead of
// externalized so the number reflects the true cost of shipping this bundle standalone,
// not gameable by moving deps around.
export default defineBuildConfig({
  entries: [
    'src/client/minimal',
  ],
  outDir: 'dist/client-sc',
  failOnWarn: false,
  rollup: {
    inlineDependencies: true,
    esbuild: {
      define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
      },
      treeShaking: true,
      minify: true,
    },
    alias: {
      entries: [
        { find: 'unhead/client', replacement: path.join(packagesDir, 'unhead/dist/client.mjs') },
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
      const file = path.resolve(__dirname, 'dist/client-sc/client/minimal.mjs')
      const contents = fs.readFileSync(file)
      const size = contents.length
      const compressed = zlib.gzipSync(contents).length
      const baseline = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'last.json'), 'utf8')).clientSelfContained?.gz
      if (baseline && compressed > Math.ceil(baseline * 1.04))
        throw new Error(`Client runtime budget exceeded: ${compressed} B > ${Math.ceil(baseline * 1.04)} B (4% over the tracked gzip baseline).`)
      console.log(`CLIENT (self-contained) Size: ${Math.round(size / 102.4) / 10} kB (gzipped: ${Math.round(compressed / 102.4) / 10} kB)`)
    },
  },
})
