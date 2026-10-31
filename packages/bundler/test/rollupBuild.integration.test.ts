import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'unbuild'
import { expect, it } from 'vitest'
import { UnheadTransforms } from '../src/unplugin/createTransformPipeline'

it('bundles and renders a workspace sealed runtime through the CommonJS resolver', async () => {
  const outDir = await mkdtemp(join(tmpdir(), 'unhead-rollup-'))
  try {
    await build(fileURLToPath(new URL('./fixtures/rollup-build', import.meta.url)), false, {
      entries: ['entry'],
      outDir,
      declaration: false,
      failOnWarn: false,
      rollup: {
        inlineDependencies: true,
        alias: {
          entries: [
            { find: 'unhead/precompiled/server', replacement: fileURLToPath(new URL('../../unhead/dist/precompiled/server.mjs', import.meta.url)) },
          ],
        },
      },
      hooks: {
        'rollup:options': (_ctx, options) => {
          options.plugins.unshift(UnheadTransforms.rollup({
            consumer: 'server',
            precompile: {},
            treeshake: false,
            seoMeta: false,
            minify: false,
          }))
        },
      },
    })
    // Load the generated module to verify its public rendering behavior.
    const { render } = await import(pathToFileURL(join(outDir, 'entry.mjs')).href)
    expect(render().headTags).toBe('<title>Rollup precompile</title>')
  }
  finally {
    await rm(outDir, { recursive: true, force: true })
  }
}, 15000)
