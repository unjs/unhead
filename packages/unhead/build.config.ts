import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
// @ts-expect-error bundled by unbuild
import nodeResolve from '@rollup/plugin-node-resolve'
// @ts-expect-error bundled by unbuild
import { rollup } from 'rollup'
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  clean: true,
  declaration: true,
  hooks: {
    'rollup:options': (_, options) => {
      options.experimentalLogSideEffects = true
    },
    'build:done': async function (ctx) {
      // Build the streaming IIFE with all dependencies bundled
      const bundle = await rollup({
        input: resolve(ctx.options.rootDir, 'dist/stream/iife.mjs'),
        plugins: [nodeResolve()],
      })

      const { output } = await bundle.generate({ format: 'iife', name: '__unhead_iife__' })
      let code = output[0].code

      // Basic minification - remove comments and extra whitespace
      code = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').replace(/\s+/g, ' ').trim()

      // Write as standalone IIFE file
      writeFileSync(resolve(ctx.options.rootDir, 'dist/stream/iife.global.js'), code)

      // Write as ES module exporting the code string (for inlining in Vite plugin)
      writeFileSync(
        resolve(ctx.options.rootDir, 'dist/stream/iife.mjs'),
        `export const streamingIifeCode = ${JSON.stringify(code)};\nexport const streamingIifeSize = ${code.length};\n`,
      )

      console.log(`Built streaming IIFE: ${code.length} bytes`)
      await bundle.close()
    },
  },
  entries: [
    { input: 'src/index', name: 'index' },
    { input: 'src/types/index', name: 'types' },
    { input: 'src/server/index', name: 'server' },
    { input: 'src/client/index', name: 'client' },
    { input: 'src/stream/server', name: 'stream/server' },
    { input: 'src/stream/client', name: 'stream/client' },
    { input: 'src/stream/iife', name: 'stream/iife' },
    { input: 'src/scripts/index', name: 'scripts' },
    { input: 'src/utils', name: 'utils' },
    { input: 'src/plugins/index', name: 'plugins' },
    { input: 'src/parser/index', name: 'parser' },
    { input: 'src/stream/vite', name: 'stream/vite' },
  ],
})
