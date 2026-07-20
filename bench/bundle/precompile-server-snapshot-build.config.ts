import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { defineBuildConfig } from 'unbuild'
import { UnheadTransforms } from '../../packages/bundler/src/unplugin/createTransformPipeline'

const packagesDir = path.resolve(__dirname, '../../packages')

export default defineBuildConfig({
  entries: ['src/vue-server/precompile-snapshot'],
  outDir: 'dist/precompile-runtime-snapshot',
  failOnWarn: false,
  rollup: {
    inlineDependencies: true,
    esbuild: { define: { 'process.env.NODE_ENV': JSON.stringify('production') }, treeShaking: true, minify: true },
    alias: {
      entries: [
        { find: 'unhead/precompiled/server-snapshot', replacement: path.join(packagesDir, 'unhead/dist/precompiled/server-snapshot.mjs') },
        { find: 'unhead/precompiled/server', replacement: path.join(packagesDir, 'unhead/dist/precompiled/server.mjs') },
        { find: 'unhead/types', replacement: path.join(packagesDir, 'unhead/dist/types.mjs') },
      ],
    },
  },
  declaration: false,
  hooks: {
    'rollup:options': (_ctx, config) => {
      config.plugins.unshift(UnheadTransforms.rollup({ consumer: 'server', treeshake: false, seoMeta: false, precompile: { mode: 'snapshot' }, minify: false }))
    },
    'build:done': () => {
      const file = path.resolve(__dirname, 'dist/precompile-runtime-snapshot/vue-server/precompile-snapshot.mjs')
      const contents = fs.readFileSync(file)
      console.log(`PRECOMPILE SERVER SNAPSHOT Size: ${contents.length} bytes, gzip: ${zlib.gzipSync(contents).length} bytes`)
    },
  },
})
