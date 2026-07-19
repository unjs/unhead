import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import zlib from 'node:zlib'
import { defineBuildConfig } from 'unbuild'
import { UnheadTransforms } from '../../packages/bundler/src/unplugin/createTransformPipeline'
import { SSRStaticReplace } from '../../packages/bundler/src/unplugin/SSRStaticReplace'

const packagesDir = path.resolve(__dirname, '../../packages')
const withPrecompile = process.env.UNHEAD_BUNDLE_PRECOMPILE === 'true'
const variant = withPrecompile ? 'precompile-runtime-on' : 'precompile-runtime-off'

export default defineBuildConfig({
  entries: [
    'src/vue-server/precompile-runtime',
  ],
  outDir: `dist/${variant}`,
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
        { find: '@unhead/vue/server', replacement: path.join(packagesDir, 'vue/dist/server.mjs') },
        { find: '@unhead/vue', replacement: path.join(packagesDir, 'vue/dist/index.mjs') },
        { find: 'unhead/precompiled/server', replacement: withPrecompile ? path.join(packagesDir, 'unhead/dist/precompiled/server.mjs') : path.resolve(__dirname, 'src/vue-server/precompile-runtime-off.ts') },
        { find: 'unhead/precompiled', replacement: path.join(packagesDir, 'unhead/dist/precompiled.mjs') },
        { find: 'unhead/server', replacement: path.join(packagesDir, 'unhead/dist/server.mjs') },
        { find: 'unhead/plugins', replacement: path.join(packagesDir, 'unhead/dist/plugins.mjs') },
        { find: 'unhead/utils', replacement: path.join(packagesDir, 'unhead/dist/utils.mjs') },
        { find: 'unhead/types', replacement: path.join(packagesDir, 'unhead/dist/types.mjs') },
        { find: /^unhead$/, replacement: path.join(packagesDir, 'unhead/dist/index.mjs') },
      ],
    },
  },
  externals: [
    'vue',
  ],
  declaration: false,
  hooks: {
    'rollup:options': (_ctx, config) => {
      config.plugins.unshift(
        UnheadTransforms.rollup({
          treeshake: {},
          seoMeta: {},
          precompile: withPrecompile ? {} : false,
          minify: false,
        }),
        SSRStaticReplace.rollup({}),
        {
          name: 'assert-precompile-transform-count',
          transform(code, id) {
            if (!id.endsWith('/precompile-runtime.ts'))
              return
            const imports = code.match(/precompiledHeadInput as __unhead_precompiled/g)?.length || 0
            const calls = code.match(/__unhead_precompiled\(/g)?.length || 0
            if (imports !== (withPrecompile ? 1 : 0) || calls !== (withPrecompile ? 4 : 0))
              throw new Error(`Expected precompile ${withPrecompile ? 'ON' : 'OFF'} fixture to contain ${withPrecompile ? 'one helper import and four calls' : 'no helper imports or calls'}, found ${imports} import(s) and ${calls} call(s).`)
          },
        },
      )
    },
    'build:done': () => {
      const file = path.resolve(__dirname, `dist/${variant}/vue-server/precompile-runtime.mjs`)
      const contents = fs.readFileSync(file)
      const compressed = zlib.gzipSync(contents).length
      const output = contents.toString()
      const strictRuntime = output.includes('precompiled-only runtime')
      const dynamicNormalizer = output.includes('__proto__')
      if (strictRuntime !== withPrecompile || dynamicNormalizer === withPrecompile)
        throw new Error(`Precompile ${withPrecompile ? 'ON' : 'OFF'} graph was invalid: strict runtime ${strictRuntime ? 'present' : 'absent'}, dynamic normalizer ${dynamicNormalizer ? 'present' : 'absent'}.`)
      if (output.includes('toJSON') !== withPrecompile)
        throw new Error(`The streaming-safe carrier was ${withPrecompile ? 'missing from' : 'unexpectedly present in'} the precompile ${withPrecompile ? 'ON' : 'OFF'} graph.`)
      console.log(`PRECOMPILE RUNTIME (${withPrecompile ? 'on' : 'off'}) Size: ${contents.length} bytes, gzip: ${compressed} bytes`)
    },
  },
})
