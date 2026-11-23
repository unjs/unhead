import { Buffer } from 'node:buffer'
import path from 'node:path'
import zlib from 'node:zlib'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineBuildConfig } from 'unbuild'

const packagesDir = path.resolve(__dirname, '../../packages')

export default defineBuildConfig({
  entries: [
    'src/react-client/lazy',
  ],
  outDir: 'dist/react-client-lazy',
  failOnWarn: false,
  // a production build, so the dev warning must leave no code
  replace: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  rollup: {
    inlineDependencies: true,
    esbuild: {
      treeShaking: true,
      minify: true,
    },
    alias: {
      entries: [
        { find: '@unhead/react/lazy', replacement: path.join(packagesDir, 'react/dist/lazy.mjs') },
        { find: 'unhead/lazy', replacement: path.join(packagesDir, 'unhead/dist/lazy.mjs') },
        { find: '@unhead/react/client', replacement: path.join(packagesDir, 'react/dist/client.mjs') },
        { find: '@unhead/react', replacement: path.join(packagesDir, 'react/dist/index.mjs') },
        { find: 'unhead/stream/client', replacement: path.join(packagesDir, 'unhead/dist/stream/client.mjs') },
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
    'react',
    'react/jsx-runtime',
    'react-dom',
  ],
  declaration: false,
  hooks: {
    'rollup:options': (ctx, config) => {
      config.experimentalLogSideEffects = true
      config.plugins.push(visualizer({
        emitFile: true,
        filename: 'stats.html',
      }))
      config.plugins.push({
        name: 'react-lazy-startup-size',
        generateBundle(_, bundle) {
          const seen = new Set(['react', 'react/jsx-runtime', 'react-dom'])
          let raw = 0
          let gzip = 0
          function measure(id: string) {
            if (seen.has(id))
              return
            seen.add(id)
            const chunk = bundle[id]
            if (chunk?.type !== 'chunk')
              throw new Error(`The lazy React entry references an unmeasured startup module: ${id}`)
            raw += Buffer.byteLength(chunk.code)
            gzip += zlib.gzipSync(chunk.code).length
            chunk.imports.forEach(measure)
          }
          measure('react-client/lazy.mjs')
          console.log(`REACT CLIENT LAZY Size: ${raw} B (gzipped: ${gzip} B)`)
        },
      })
    },
  },
})
