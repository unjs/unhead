import { describe, expect, it } from 'vitest'
import { CreateHeadTransform, createHeadTransformContext } from '../src/unplugin/CreateHeadTransform'

function createPlugin(registrations: Parameters<ReturnType<typeof createHeadTransformContext>['addRuntimePlugin']>[0][], consumer: 'client' | 'server' = 'client') {
  const ctx = createHeadTransformContext()
  for (const reg of registrations)
    ctx.addRuntimePlugin(reg)
  const plugin = CreateHeadTransform(ctx) as any
  // Simulate configResolved
  plugin.configResolved({ root: '/project' })
  const mockContext = {
    environment: { config: { consumer } },
  }
  return {
    transform(code: string, id = 'entry.ts') {
      return plugin.transform.handler.call(mockContext, code, id)
    },
  }
}

describe('createHeadTransform', () => {
  it('ignores files without createHead', async () => {
    const { transform } = createPlugin([{
      import: { name: 'ValidatePlugin', source: '@unhead/vue/plugins', as: '__validate' },
      client: '_h.use(__validate())',
    }])
    expect(await transform('const x = 1')).toBeUndefined()
  })

  // Note: non-JS file filtering is handled by Vite's transform.filter.id at runtime,
  // not by the handler itself, so we don't test it here.

  it('does nothing when no registrations exist', async () => {
    const { transform } = createPlugin([])
    expect(await transform(`import { createHead } from '@unhead/vue/client'\nconst head = createHead()`)).toBeUndefined()
  })

  it('wraps createHead with client plugin on client', async () => {
    const { transform } = createPlugin([{
      import: { name: 'ValidatePlugin', source: '@unhead/vue/plugins', as: '__validate' },
      client: '_h.use(__validate({ root: __ROOT__ }))',
    }], 'client')
    const result = await transform(`import { createHead } from '@unhead/vue/client'\nconst head = createHead()`)
    expect(result.code).toContain('import { ValidatePlugin as __validate } from \'@unhead/vue/plugins\'')
    expect(result.code).toContain('_h.use(__validate({ root: "/project" }))')
    expect(result.code).not.toContain('typeof window')
  })

  it('wraps createHead with server plugin on server', async () => {
    const { transform } = createPlugin([{
      import: { name: 'devtoolsPlugin', source: '@unhead/bundler', as: '__devtools' },
      server: '_h.use(__devtools())',
    }], 'server')
    const result = await transform(`import { createHead } from '@unhead/vue/server'\nconst head = createHead()`)
    expect(result.code).toContain('import { devtoolsPlugin as __devtools } from \'@unhead/bundler\'')
    expect(result.code).toContain('_h.use(__devtools())')
  })

  it('skips client-only registrations on server', async () => {
    const { transform } = createPlugin([{
      import: { name: 'ValidatePlugin', source: '@unhead/vue/plugins', as: '__validate' },
      client: '_h.use(__validate())',
    }], 'server')
    expect(await transform(`import { createHead } from '@unhead/vue/server'\nconst head = createHead()`)).toBeUndefined()
  })

  it('skips server-only registrations on client', async () => {
    const { transform } = createPlugin([{
      import: { name: 'devtoolsPlugin', source: '@unhead/bundler', as: '__devtools' },
      server: '_h.use(__devtools())',
    }], 'client')
    expect(await transform(`import { createHead } from '@unhead/vue/client'\nconst head = createHead()`)).toBeUndefined()
  })

  it('combines multiple registrations', async () => {
    const { transform } = createPlugin([
      {
        import: { name: 'ValidatePlugin', source: '@unhead/vue/plugins', as: '__validate' },
        client: '_h.use(__validate())',
      },
      {
        import: { name: 'devtoolsPlugin', source: '@unhead/bundler', as: '__devtools' },
        client: 'window.__unhead_devtools__=_h',
      },
    ], 'client')
    const result = await transform(`import { createHead } from '@unhead/vue/client'\nconst head = createHead()`)
    expect(result.code).toContain('import { ValidatePlugin as __validate }')
    expect(result.code).toContain('import { devtoolsPlugin as __devtools }')
    expect(result.code).toContain('_h.use(__validate()),window.__unhead_devtools__=_h')
  })

  it('replaces __ROOT__ with project root', async () => {
    const { transform } = createPlugin([{
      import: { name: 'ValidatePlugin', source: 'unhead/plugins', as: '__validate' },
      client: '_h.use(__validate({ root: __ROOT__ }))',
    }], 'client')
    const result = await transform(`import { createHead } from 'unhead/client'\nconst head = createHead()`)
    expect(result.code).toContain('root: "/project"')
  })

  it('handles namespace imports like ns.createHead()', async () => {
    const { transform } = createPlugin([{
      import: { name: 'ValidatePlugin', source: 'unhead/plugins', as: '__validate' },
      client: '_h.use(__validate())',
    }], 'client')
    const result = await transform(`import * as unhead from '@unhead/vue/client'\nconst head = unhead.createHead()`)
    expect(result.code).toContain('_h.use(__validate())')
  })

  it('respects local-name aliasing', async () => {
    const { transform } = createPlugin([{
      import: { name: 'ValidatePlugin', source: 'unhead/plugins', as: '__validate' },
      client: '_h.use(__validate())',
    }], 'client')
    const result = await transform(`import { createHead as makeHead } from '@unhead/vue/client'\nconst head = makeHead()`)
    expect(result.code).toContain('_h.use(__validate())')
  })

  it('does not rewrite createHead from non-Unhead packages', async () => {
    const { transform } = createPlugin([{
      import: { name: 'ValidatePlugin', source: 'unhead/plugins', as: '__validate' },
      client: '_h.use(__validate())',
    }], 'client')
    expect(await transform(`import { createHead } from 'some-other-lib'\nconst head = createHead()`)).toBeUndefined()
  })

  it('does not rewrite namespace createHead from non-Unhead packages', async () => {
    const { transform } = createPlugin([{
      import: { name: 'ValidatePlugin', source: 'unhead/plugins', as: '__validate' },
      client: '_h.use(__validate())',
    }], 'client')
    expect(await transform(`import * as other from 'some-other-lib'\nconst head = other.createHead()`)).toBeUndefined()
  })

  it('does not rewrite shadowed local createHead', async () => {
    const { transform } = createPlugin([{
      import: { name: 'ValidatePlugin', source: 'unhead/plugins', as: '__validate' },
      client: '_h.use(__validate())',
    }], 'client')
    expect(await transform('function createHead() { return {} }\nconst head = createHead()')).toBeUndefined()
  })

  it('only imports registrations relevant to the environment', async () => {
    const { transform } = createPlugin([
      {
        import: { name: 'ValidatePlugin', source: '@unhead/vue/plugins', as: '__validate' },
        client: '_h.use(__validate())',
      },
      {
        import: { name: 'devtoolsPlugin', source: '@unhead/bundler', as: '__devtools' },
        server: '_h.use(__devtools())',
      },
    ], 'client')
    const result = await transform(`import { createHead } from '@unhead/vue/client'\nconst head = createHead()`)
    expect(result.code).toContain('import { ValidatePlugin as __validate }')
    expect(result.code).not.toContain('import { devtoolsPlugin as __devtools }')
  })
})
