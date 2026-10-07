import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { defineBuildConfig } from 'unbuild'
import { UnheadTransforms } from '../../packages/bundler/src/unplugin/createTransformPipeline'

const packagesDir = path.resolve(__dirname, '../../packages')

export default defineBuildConfig({
  entries: ['src/vue-server/precompile-unique'],
  outDir: 'dist/precompile-runtime-unique',
  failOnWarn: false,
  rollup: {
    inlineDependencies: true,
    esbuild: { define: { 'process.env.NODE_ENV': JSON.stringify('production') }, treeShaking: true, minify: true },
    alias: {
      entries: [
        { find: 'unhead/precompiled/server-unique', replacement: path.join(packagesDir, 'unhead/dist/precompiled/server-unique.mjs') },
        { find: 'unhead/precompiled/server', replacement: path.join(packagesDir, 'unhead/dist/precompiled/server.mjs') },
        { find: 'unhead/types', replacement: path.join(packagesDir, 'unhead/dist/types.mjs') },
      ],
    },
  },
  declaration: false,
  hooks: {
    'rollup:options': (_ctx, config) => {
      config.plugins.unshift(UnheadTransforms.rollup({
        consumer: 'server',
        treeshake: false,
        seoMeta: false,
        precompile: { duplicates: 'error' },
        minify: false,
      }))
    },
    'build:done': () => {
      const file = path.resolve(__dirname, 'dist/precompile-runtime-unique/vue-server/precompile-unique.mjs')
      const contents = fs.readFileSync(file)
      const output = contents.toString()
      if (output.includes('meta:description') || output.includes('new Map'))
        throw new Error('Unique server bundle retained runtime tag identities or winner maps.')
      console.log(`PRECOMPILE SERVER UNIQUE Size: ${contents.length} bytes, gzip: ${zlib.gzipSync(contents).length} bytes`)
    },
  },
})
