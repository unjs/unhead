import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import zlib from 'node:zlib'
import { defineBuildConfig } from 'unbuild'
import { UnheadTransforms } from '../../packages/bundler/src/unplugin/createTransformPipeline'

const profile = process.env.UNHEAD_PRECOMPILE_PROFILE
if (profile !== 'csr' && profile !== 'snapshot')
  throw new Error('UNHEAD_PRECOMPILE_PROFILE must be csr or snapshot')
const packagesDir = path.resolve(__dirname, '../../packages')
const entry = profile === 'snapshot' ? 'src/client/precompile-snapshot' : 'src/client/precompile-runtime'

export default defineBuildConfig({
  entries: [entry],
  outDir: `dist/precompile-client-runtime-${profile}`,
  failOnWarn: false,
  rollup: {
    inlineDependencies: true,
    esbuild: { define: { 'process.env.NODE_ENV': JSON.stringify('production') }, treeShaking: true, minify: true },
    alias: {
      entries: [
        { find: 'unhead/precompiled/client-csr', replacement: path.join(packagesDir, 'unhead/dist/precompiled/client-csr.mjs') },
        { find: 'unhead/precompiled/client-snapshot', replacement: path.join(packagesDir, 'unhead/dist/precompiled/client-snapshot.mjs') },
        { find: 'unhead/precompiled/client', replacement: path.join(packagesDir, 'unhead/dist/precompiled/client.mjs') },
        { find: 'unhead/types', replacement: path.join(packagesDir, 'unhead/dist/types.mjs') },
      ],
    },
  },
  declaration: false,
  hooks: {
    'rollup:options': (_ctx, config) => {
      config.plugins.unshift(UnheadTransforms.rollup({
        consumer: 'client',
        treeshake: false,
        seoMeta: false,
        precompile: profile === 'snapshot' ? { mode: 'snapshot' } : { client: 'csr' },
        minify: false,
      }))
    },
    'build:done': () => {
      const name = profile === 'snapshot' ? 'precompile-snapshot' : 'precompile-runtime'
      const file = path.resolve(__dirname, `dist/precompile-client-runtime-${profile}/client/${name}.mjs`)
      const contents = fs.readFileSync(file)
      console.log(`PRECOMPILE CLIENT ${profile.toUpperCase()} Size: ${contents.length} bytes, gzip: ${zlib.gzipSync(contents).length} bytes`)
    },
  },
})
