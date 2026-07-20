import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { defineBuildConfig } from 'unbuild'
import { UnheadTransforms } from '../../packages/bundler/src/unplugin/createTransformPipeline'

const packagesDir = path.resolve(__dirname, '../../packages')
const outDir = 'dist/precompile-client-runtime-deferred'

export default defineBuildConfig({
  entries: ['src/client/precompile-runtime'],
  outDir,
  failOnWarn: false,
  rollup: {
    inlineDependencies: true,
    output: {
      manualChunks(id) {
        if (/[\\/]precompiled[\\/]client\.mjs$/.test(id))
          return 'client'
      },
    },
    esbuild: {
      define: { 'process.env.NODE_ENV': JSON.stringify('production') },
      treeShaking: true,
      minify: true,
    },
    alias: {
      entries: [
        { find: 'unhead/precompiled/client-deferred', replacement: path.join(packagesDir, 'unhead/dist/precompiled/client-deferred.mjs') },
        { find: 'unhead/precompiled/client', replacement: path.join(packagesDir, 'unhead/dist/precompiled/client.mjs') },
        { find: 'unhead/types', replacement: path.join(packagesDir, 'unhead/dist/types.mjs') },
        { find: /^unhead$/, replacement: path.join(packagesDir, 'unhead/dist/index.mjs') },
      ],
    },
  },
  declaration: false,
  hooks: {
    'rollup:options': (_ctx, config) => {
      config.plugins.unshift(UnheadTransforms.rollup({
        consumer: 'client',
        treeshake: {},
        seoMeta: {},
        precompile: { client: 'deferred' },
        minify: false,
      }))
    },
    'build:done': () => {
      const root = path.resolve(__dirname, outDir)
      const entry = path.join(root, 'client/precompile-runtime.mjs')
      const initial = fs.readFileSync(entry)
      const chunks = path.join(root, 'chunks')
      const asyncFiles = fs.existsSync(chunks) ? fs.readdirSync(chunks).filter(file => file.endsWith('.mjs')) : []
      const asyncSize = asyncFiles.reduce((total, file) => total + fs.readFileSync(path.join(chunks, file)).length, 0)
      if (!asyncFiles.includes('client.mjs') || !initial.toString().includes('import('))
        throw new Error('Deferred client precompile did not produce an async runtime chunk.')
      console.log(`PRECOMPILE CLIENT DEFERRED Initial: ${initial.length} bytes, gzip: ${zlib.gzipSync(initial).length} bytes; async: ${asyncSize} bytes`)
    },
  },
})
