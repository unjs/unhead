import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import zlib from 'node:zlib'
import { defineBuildConfig } from 'unbuild'
import { UnheadTransforms } from '../../packages/bundler/src/unplugin/createTransformPipeline'

const packagesDir = path.resolve(__dirname, '../../packages')
const withPrecompile = process.env.UNHEAD_BUNDLE_PRECOMPILE === 'true'
const variant = withPrecompile ? 'precompile-client-runtime-on' : 'precompile-client-runtime-off'

export default defineBuildConfig({
  entries: ['src/client/precompile-runtime'],
  outDir: `dist/${variant}`,
  failOnWarn: false,
  rollup: {
    inlineDependencies: true,
    esbuild: {
      define: { 'process.env.NODE_ENV': JSON.stringify('production') },
      treeShaking: true,
      minify: true,
    },
    alias: {
      entries: [
        { find: 'unhead/precompiled/client', replacement: withPrecompile ? path.join(packagesDir, 'unhead/dist/precompiled/client.mjs') : path.resolve(__dirname, 'src/client/precompile-runtime-off.ts') },
        { find: 'unhead/client', replacement: path.join(packagesDir, 'unhead/dist/client.mjs') },
        { find: 'unhead/plugins', replacement: path.join(packagesDir, 'unhead/dist/plugins.mjs') },
        { find: 'unhead/utils', replacement: path.join(packagesDir, 'unhead/dist/utils.mjs') },
        { find: 'unhead/types', replacement: path.join(packagesDir, 'unhead/dist/types.mjs') },
        { find: /^unhead$/, replacement: path.join(packagesDir, 'unhead/dist/index.mjs') },
      ],
    },
  },
  declaration: false,
  hooks: {
    'rollup:options': (_ctx, config) => {
      config.plugins.unshift(
        UnheadTransforms.rollup({
          consumer: 'client',
          treeshake: {},
          seoMeta: {},
          precompile: withPrecompile ? {} : false,
          minify: false,
        }),
        {
          name: 'assert-client-precompile-transform-count',
          transform(code, id) {
            if (!id.endsWith('/precompile-runtime.ts'))
              return
            const plans = code.match(/const __unhead_precompiled_plan_/g)?.length || 0
            if (plans !== (withPrecompile ? 4 : 0))
              throw new Error(`Expected client precompile ${withPrecompile ? 'ON' : 'OFF'} fixture to contain ${withPrecompile ? 'four hoisted plans' : 'no hoisted plans'}, found ${plans}.`)
          },
        },
      )
    },
    'build:done': () => {
      const file = path.resolve(__dirname, `dist/${variant}/client/precompile-runtime.mjs`)
      const contents = fs.readFileSync(file)
      const compressed = zlib.gzipSync(contents).length
      const dynamicNormalizer = contents.toString().includes('__proto__')
      if (dynamicNormalizer === withPrecompile)
        throw new Error(`Client precompile ${withPrecompile ? 'ON' : 'OFF'} graph did not isolate the dynamic normalizer.`)
      console.log(`PRECOMPILE CLIENT RUNTIME (${withPrecompile ? 'on' : 'off'}) Size: ${contents.length} bytes, gzip: ${compressed} bytes`)
    },
  },
})
