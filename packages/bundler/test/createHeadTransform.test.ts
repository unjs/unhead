import { describe, expect, it } from 'vitest'
import { CreateHeadTransform, createHeadTransformContext } from '../src/unplugin/CreateHeadTransform'
import { Unhead } from '../src/unplugin/vite'
import { passesTransformFilter } from './utils'

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
    plugin,
    transform(code: string, id = 'entry.ts') {
      return plugin.transform.handler.call(mockContext, code, id)
    },
  }
}

describe('createHeadTransform', () => {
  it.each([
    '/src/main.ts',
    '/src/main.mts',
    '/src/main.cts',
    '/src/main.mjs',
    '/src/main.tsx',
    '/src/App.vue',
    // dev ids and SFC sub-requests carry a query
    '/src/main.ts?t=1730000000',
    '/src/App.vue?vue&type=script&setup=true',
    '/src/App.svelte?svelte&type=script&lang.ts',
  ])('runs on %s', (id) => {
    const { plugin } = createPlugin([{
      import: { name: 'ValidatePlugin', source: '@unhead/vue/plugins', as: '__validate' },
      client: '_h.use(__validate())',
    }])
    expect(passesTransformFilter(plugin, id, 'const head = createHead()')).toBe(true)
  })

  it('skips ids and sources that cannot hold a createHead call', () => {
    const { plugin } = createPlugin([{
      import: { name: 'ValidatePlugin', source: '@unhead/vue/plugins', as: '__validate' },
      client: '_h.use(__validate())',
    }])
    expect(passesTransformFilter(plugin, '/src/style.css', 'const head = createHead()')).toBe(false)
    expect(passesTransformFilter(plugin, '/src/main.ts', 'const x = 1')).toBe(false)
  })

  it('ignores files without createHead', async () => {
    const { transform } = createPlugin([{
      import: { name: 'ValidatePlugin', source: '@unhead/vue/plugins', as: '__validate' },
      client: '_h.use(__validate())',
    }])
    expect(await transform('const x = 1')).toBeUndefined()
  })

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
    expect(result.code).toContain('import { ValidatePlugin as __validate } from "@unhead/vue/plugins"')
    expect(result.code).toContain('_h.use(__validate({ root: "/project" }))')
    expect(result.code).not.toContain('typeof window')
  })

  it('wraps createHead with server plugin on server', async () => {
    const { transform } = createPlugin([{
      import: { name: 'devtoolsPlugin', source: '@unhead/bundler', as: '__devtools' },
      server: '_h.use(__devtools())',
    }], 'server')
    const result = await transform(`import { createHead } from '@unhead/vue/server'\nconst head = createHead()`)
    expect(result.code).toContain('import { devtoolsPlugin as __devtools } from "@unhead/bundler"')
    expect(result.code).toContain('_h.use(__devtools())')
  })

  it.each([
    '/Users/o\'brien/app/node_modules/@unhead/bundler/dist/index.mjs',
    '/tmp/line\nbreak/node_modules/@unhead/bundler/dist/index.mjs',
  ])('emits a valid string literal for the import source %j', async (source) => {
    const { transform } = createPlugin([{
      import: { name: 'devtoolsPlugin', source, as: '__devtools' },
      server: '_h.use(__devtools())',
    }], 'server')
    const result = await transform(`import { createHead } from '@unhead/vue/server'\nconst head = createHead()`)
    const literal = result.code.match(/^import \{ devtoolsPlugin as __devtools \} from (.+);$/m)?.[1]
    expect(literal).toBeTruthy()
    expect(JSON.parse(literal!)).toBe(source)
  })

  it('injects validation into development server heads', async () => {
    const plugin = (Unhead({ devtools: false }) as any[]).find(plugin => plugin?.name === '@unhead/create-head-transform')
    plugin.configResolved({ root: '/project' })
    const result = await plugin.transform.handler.call(
      { environment: { config: { consumer: 'server' } } },
      `import { createHead } from 'unhead/server'\nconst head = createHead()`,
      'entry.ts',
    )

    expect(result.code).toContain('_h.use(__unhead_validate({ root: "/project" }))')
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
