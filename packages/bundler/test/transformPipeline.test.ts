import type { MinifyFn } from '../src/unplugin/MinifyTransform'
import { describe, expect, it, vi } from 'vitest'
import { UnheadTransforms } from '../src/unplugin/createTransformPipeline'
import { MinifyTransform } from '../src/unplugin/MinifyTransform'
import { TreeshakeServerComposables } from '../src/unplugin/TreeshakeServerComposables'
import { UseSeoMetaTransform } from '../src/unplugin/UseSeoMetaTransform'

const mockJSMinifier: MinifyFn = async code =>
  code.replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim()

const mockCSSMinifier: MinifyFn = async code =>
  code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim()

function environmentContext(consumer?: 'client' | 'server') {
  return consumer ? { environment: { config: { consumer } } } : {}
}

/** Replicates how a bundler invokes one plugin: id filter, code filter, handler. */
async function runPlugin(plugin: any, code: string, id: string, ctx: any): Promise<string | undefined> {
  if (plugin.transformInclude && !plugin.transformInclude(id))
    return undefined
  const codeFilter = plugin.transform?.filter?.code
  if (codeFilter && !codeFilter.test(code))
    return undefined
  const res = await plugin.transform.handler.call(ctx, code, id)
  return res?.code
}

/** The pre-pipeline behavior: three sequential passes, each re-parsing the previous output. */
async function threePass(code: string, id: string, ctx: any): Promise<string> {
  const plugins = [
    TreeshakeServerComposables.vite({}) as any,
    UseSeoMetaTransform.vite({}) as any,
    MinifyTransform.vite({ js: mockJSMinifier, css: mockCSSMinifier }) as any,
  ]
  let current = code
  for (const plugin of plugins)
    current = (await runPlugin(plugin, current, id, ctx)) ?? current
  return current
}

function unifiedPlugin(options: any = {}) {
  return UnheadTransforms.vite({
    treeshake: {},
    seoMeta: {},
    minify: { js: mockJSMinifier, css: mockCSSMinifier },
    ...options,
  }) as any
}

async function unified(code: string, id: string, ctx: any): Promise<string> {
  return (await runPlugin(unifiedPlugin(), code, id, ctx)) ?? code
}

const fixtures: Record<string, string> = {
  'treeshake proven import': [
    'import { useServerHead } from \'unhead\'',
    'useServerHead({ title: \'Hello\' })',
    'console.log(\'kept\')',
  ].join('\n'),
  'treeshake auto-import': [
    'useServerSeoMeta({ description: \'World\' })',
    'console.log(\'kept\')',
  ].join('\n'),
  'treeshake shadowed name retained': [
    'function useServerHead(input) { return input }',
    'useServerHead({ title: \'Hello\' })',
  ].join('\n'),
  'seoMeta static': [
    'import { useSeoMeta } from \'unhead\'',
    'useSeoMeta({ title: \'Hello\', description: \'World\' })',
  ].join('\n'),
  'seoMeta untransformable sibling': [
    'import { useSeoMeta } from \'unhead\'',
    'const meta = {}',
    'useSeoMeta({ title: \'Hello\', description: \'World\' })',
    'useSeoMeta(meta, { tagPriority: 10 })',
  ].join('\n'),
  'seoMeta media expansion': [
    'import { useSeoMeta } from \'unhead\'',
    'useSeoMeta({ ogImage: { url: \'/og.png\', width: 800 }, twitterImage: [{ url: \'/t.png\', alt: \'hi\' }] })',
  ].join('\n'),
  'seoMeta packed robots object': [
    'import { useSeoMeta } from \'unhead\'',
    'useSeoMeta({ title: \'Hello\', robots: { noindex: false, nofollow: true, maxSnippet: -1 } })',
  ].join('\n'),
  'seoMeta residual split': [
    'import { useSeoMeta } from \'unhead\'',
    'const flag = true',
    'useSeoMeta({ title: \'Hello\', description: \'World\', robots: { noindex: flag } })',
  ].join('\n'),
  'seoMeta server residual split': [
    'import { useServerSeoMeta } from \'unhead\'',
    'const flag = true',
    'useServerSeoMeta({ title: \'Hello\', description: \'World\', robots: { noindex: flag } })',
    'console.log(\'kept\')',
  ].join('\n'),
  'seoMeta server variant': [
    'import { useServerSeoMeta } from \'unhead\'',
    'const keep = useServerSeoMeta',
    'useServerSeoMeta({ title: \'Hello\', description: \'World\' })',
  ].join('\n'),
  'minify script and style': [
    'import { useHead } from \'unhead\'',
    'useHead({',
    '  script: [{ innerHTML: \'// comment\\nvar x = 1;  var y = 2;\' }],',
    '  style: [{ innerHTML: \'/* comment */ body { margin: 0; }\' }]',
    '})',
  ].join('\n'),
  'all three concerns': [
    'import { useSeoMeta, useServerSeoMeta, useServerHead, useHead } from \'unhead\'',
    'useServerHead({ script: [{ innerHTML: \'// server only comment\\nvar a = 1;  var b = 2;\' }] })',
    'useServerSeoMeta({ description: \'Server\' })',
    'useSeoMeta({ title: \'Hello\', description: \'World\' })',
    'useHead({ script: [{ innerHTML: \'// client comment\\nvar x = 1;  var y = 2;\' }] })',
    'console.log(\'kept\')',
  ].join('\n'),
  'treeshake plus minify auto-imports': [
    'useServerHead({ script: [{ innerHTML: \'// server comment\\nvar a = 1;  var b = 2;\' }] })',
    'useHead({ style: [{ innerHTML: \'/* keep */ body { margin: 0;  padding: 0; }\' }] })',
  ].join('\n'),
  'unrelated module': [
    'import { ref } from \'vue\'',
    'export const value = ref(1)',
  ].join('\n'),
}

describe('transform pipeline differential', () => {
  for (const target of ['client', 'server', undefined] as const) {
    describe(`target: ${target ?? 'unknown'}`, () => {
      for (const [name, code] of Object.entries(fixtures)) {
        it(name, async () => {
          const ctx = environmentContext(target)
          const expected = await threePass(code, '/app/page.ts', ctx)
          const actual = await unified(code, '/app/page.ts', ctx)
          expect(actual).toBe(expected)
        })
      }
    })
  }
})

describe('transform pipeline phase ordering', () => {
  it('does not seoMeta-rewrite or minify a call removed by treeshake', async () => {
    const js = vi.fn(mockJSMinifier)
    const plugin = UnheadTransforms.vite({
      treeshake: {},
      seoMeta: {},
      minify: { js },
    }) as any
    const code = [
      'import { useServerSeoMeta, useServerHead } from \'unhead\'',
      'useServerHead({ script: [{ innerHTML: \'// server comment\\nvar a = 1;  var b = 2;\' }] })',
      'useServerSeoMeta({ description: \'Server\' })',
      'console.log(\'kept\')',
    ].join('\n')
    const result = await runPlugin(plugin, code, '/app/page.ts', environmentContext('client'))
    expect(result).toBeDefined()
    // removed, not rewritten to useHead/useServerHead calls
    expect(result).not.toContain('useServerHead({')
    expect(result).not.toContain('useServerSeoMeta({')
    expect(result).toContain('console.log(\'kept\')')
    // the import is left as-is (dead, dropped by the bundler), same as the sequential composition
    expect(result).toContain('import { useServerSeoMeta, useServerHead } from \'unhead\'')
    // nothing inside the removed statement was minified
    expect(js).not.toHaveBeenCalled()
  })

  it('retains and transforms server composables on server and unknown targets', async () => {
    const code = [
      'import { useServerSeoMeta } from \'unhead\'',
      'useServerSeoMeta({ title: \'Hello\', description: \'World\' })',
    ].join('\n')
    for (const ctx of [environmentContext('server'), environmentContext()]) {
      const result = await runPlugin(unifiedPlugin(), code, '/app/page.ts', ctx)
      expect(result).toContain('useHead({')
      expect(result).toContain('useServerHead({')
    }
  })

  it('handles client and server environments independently on one plugin instance', async () => {
    const plugin = unifiedPlugin()
    expect(plugin.sharedDuringBuild).toBe(true)
    const code = [
      'import { useServerHead } from \'unhead\'',
      'useServerHead({ title: \'Hello\' })',
    ].join('\n')
    const client = await runPlugin(plugin, code, '/app/page.ts', environmentContext('client'))
    const server = await runPlugin(plugin, code, '/app/page.ts', environmentContext('server'))
    expect(client).toBeDefined()
    expect(client).not.toContain('useServerHead(')
    expect(server).toBeUndefined()
  })

  it('installs on serve for the seoMeta/minify concerns but disables treeshake', async () => {
    const plugin = unifiedPlugin()
    expect(plugin.apply({}, { command: 'serve', isSsrBuild: false })).toBe(true)
    const treeshakeCode = [
      'import { useServerHead } from \'unhead\'',
      'useServerHead({ title: \'Hello\' })',
    ].join('\n')
    // treeshake must not run in dev, even when the environment reports a client consumer
    expect(await runPlugin(plugin, treeshakeCode, '/app/page.ts', environmentContext('client'))).toBeUndefined()
    // seoMeta still runs in dev
    const seoCode = [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ title: \'Hello\' })',
    ].join('\n')
    expect(await runPlugin(plugin, seoCode, '/app/page.ts', environmentContext('client'))).toContain('useHead({')
  })

  it('does not install on serve when treeshake is the only concern', () => {
    const plugin = UnheadTransforms.vite({ treeshake: {}, seoMeta: false, minify: false }) as any
    expect(plugin.apply({}, { command: 'serve', isSsrBuild: false })).toBe(false)
    expect(plugin.apply({}, { command: 'build', isSsrBuild: false })).toBe(true)
  })

  it('threads seoMeta importPaths into the treeshake provenance check', async () => {
    const plugin = UnheadTransforms.vite({
      treeshake: {},
      seoMeta: { importPaths: ['#imports'] },
      minify: false,
    }) as any
    const code = [
      'import { useServerHead } from \'#imports\'',
      'useServerHead({ title: \'Hello\' })',
      'console.log(\'kept\')',
    ].join('\n')
    const result = await runPlugin(plugin, code, '/app/page.ts', environmentContext('client'))
    expect(result).toBeDefined()
    expect(result).not.toContain('useServerHead(')
    expect(result).toContain('console.log(\'kept\')')
  })

  it('throws one contextual error on conflicting edits instead of producing partial output', async () => {
    // Pathological: the seoMeta rewrite claims the whole useSeoMeta() call while
    // the minify phase targets an innerHTML literal nested inside it.
    const code = [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ title: \'x\', description: (() => useHead({ script: [{ innerHTML: \'// comment\\nvar x = 1;  var y = 2;\' }] }))() })',
    ].join('\n')
    await expect(runPlugin(unifiedPlugin(), code, '/app/page.ts', environmentContext('client')))
      .rejects
      .toThrow(/conflicting transform edits in \/app\/page\.ts/)
  })

  it('returns undefined on parser failure without partial edits', async () => {
    const code = 'import { useSeoMeta } from \'unhead\'\nuseSeoMeta({ title: \'x\' )' // syntax error
    expect(await runPlugin(unifiedPlugin(), code, '/app/page.ts', environmentContext('client'))).toBeUndefined()
  })
})
