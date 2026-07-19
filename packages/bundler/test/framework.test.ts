import type { RollupPlugin, RspackPluginInstance, WebpackPluginInstance } from 'unplugin'
import type { Plugin as VitePlugin } from 'vite'
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { createFrameworkPlugin } from '../src/unplugin/framework'

const devtoolsState = vi.hoisted(() => ({
  loads: 0,
  instances: 0,
  calls: [] as string[],
}))

vi.mock('../src/devtools/vite', () => {
  devtoolsState.loads += 1
  return {
    unheadDevtools: vi.fn(() => {
      devtoolsState.instances += 1
      return {
        name: '@unhead/devtools:real',
        apply: 'serve',
        configResolved: vi.fn(() => devtoolsState.calls.push('configResolved')),
        configureServer: {
          handler: vi.fn(() => devtoolsState.calls.push('configureServer')),
        },
        resolveId: vi.fn((id: string) => {
          devtoolsState.calls.push(`resolveId:${id}`)
          if (id === '/@unhead/bridge.mjs')
            return id
        }),
        load: vi.fn((id: string) => {
          devtoolsState.calls.push(`load:${id}`)
          if (id === '/@unhead/bridge.mjs')
            return 'bridge'
        }),
        transform: {
          handler: vi.fn((code: string, id: string) => {
            devtoolsState.calls.push(`transform:${id}`)
            return { code: `${code}\n/* transformed */`, map: null }
          }),
        },
        transformIndexHtml: {
          handler: vi.fn(() => {
            devtoolsState.calls.push('transformIndexHtml')
            return [{ tag: 'script' }]
          }),
        },
        devtools: {
          setup: vi.fn(() => devtoolsState.calls.push('setup')),
        },
      }
    }),
  }
})

const streamingPlugin = {
  vite: () => ({ name: 'test:streaming' }),
  webpack: () => ({ apply() {} }),
  rspack: () => ({ apply() {} }),
  rollup: () => ({ name: 'test:streaming' }),
} as any

const Unhead = createFrameworkPlugin({
  framework: '@unhead/test',
  streamingPlugin,
})

beforeEach(() => {
  devtoolsState.loads = 0
  devtoolsState.instances = 0
  devtoolsState.calls = []
})

function names(plugins: any[]): string[] {
  return plugins.map(plugin => plugin?.name).filter(Boolean)
}

describe('createFrameworkPlugin devtools loading', () => {
  it('exposes concrete plugin types for every bundler', () => {
    const plugin = Unhead()

    expectTypeOf(plugin.vite()).toEqualTypeOf<VitePlugin[]>()
    expectTypeOf(plugin.webpack()).toEqualTypeOf<WebpackPluginInstance[]>()
    expectTypeOf(plugin.rspack()).toEqualTypeOf<RspackPluginInstance[]>()
    expectTypeOf(plugin.rollup()).toEqualTypeOf<RollupPlugin[]>()
  })

  it('does not import the Vite devtools module for non-Vite bundlers', () => {
    const plugin = Unhead()

    expect(plugin.webpack()).toEqual(expect.any(Array))
    expect(plugin.rspack()).toEqual(expect.any(Array))
    expect(plugin.rollup()).toEqual(expect.any(Array))
    expect(devtoolsState.loads).toBe(0)
  })

  it('precompiles an explicitly targeted public Rollup build', async () => {
    const plugins = Unhead({
      devtools: false,
      experimental: { precompile: { consumer: 'server' } },
      transformSeoMeta: false,
      treeshake: false,
      validate: false,
    }).rollup() as any[]
    const plugin = plugins.find(candidate => candidate.name === 'unhead:transforms')
    const result = await plugin.transform.handler.call({}, [
      'import { useHead } from \'unhead/precompiled/server\'',
      'useHead({ title: \'static\' }, { head })',
    ].join('\n'), '/app/page.ts')

    expect(result.code).toContain('const __unhead_precompiled_plan_0 = [[')
    expect(result.code).toContain('<title>static</title>')
  })

  it('does not import or include devtools when disabled for Vite', () => {
    const plugins = Unhead({ devtools: false }).vite() as any[]

    expect(names(plugins)).not.toContain('@unhead/devtools')
    expect(devtoolsState.loads).toBe(0)
  })

  it('keeps a lazy devtools proxy in the Vite plugin order', () => {
    const plugins = Unhead().vite() as any[]
    const pluginNames = names(plugins)

    expect(devtoolsState.loads).toBe(0)
    expect(pluginNames).toContain('@unhead/devtools')
    expect(pluginNames.indexOf('@unhead/devtools')).toBeLessThan(pluginNames.indexOf('unhead:ssr-static-replace'))
    expect(pluginNames.indexOf('@unhead/devtools')).toBeLessThan(pluginNames.indexOf('@unhead/create-head-transform'))
  })

  it('does not import devtools during Vite config resolution when Vite DevTools is disabled', async () => {
    const plugins = Unhead().vite() as any[]
    const devtools = plugins.find(plugin => plugin?.name === '@unhead/devtools')

    await devtools.configResolved({
      root: process.cwd(),
      devtools: { enabled: false },
      plugins,
    })

    expect(devtoolsState.loads).toBe(0)
  })

  it('forwards Vite hooks to the real devtools plugin once enabled by config', async () => {
    const plugins = Unhead().vite() as any[]
    const devtools = plugins.find(plugin => plugin?.name === '@unhead/devtools')
    const viteDevtools = { name: 'vite:devtools' }

    await devtools.configResolved({
      root: process.cwd(),
      plugins: [...plugins, viteDevtools],
    })
    await devtools.configureServer({ middlewares: { use: vi.fn() } })
    await expect(devtools.resolveId('/@unhead/bridge.mjs')).resolves.toBe('/@unhead/bridge.mjs')
    await expect(devtools.load('/@unhead/bridge.mjs')).resolves.toBe('bridge')
    await expect(devtools.transform.handler('useHead({})', '/src/app.ts')).resolves.toEqual({
      code: 'useHead({})\n/* transformed */',
      map: null,
    })
    await expect(devtools.transformIndexHtml.handler()).resolves.toEqual([{ tag: 'script' }])

    expect(devtoolsState.instances).toBe(1)
    expect(devtoolsState.calls).toEqual([
      'configResolved',
      'configureServer',
      'resolveId:/@unhead/bridge.mjs',
      'load:/@unhead/bridge.mjs',
      'transform:/src/app.ts',
      'transformIndexHtml',
    ])
  })

  it('loads the real devtools plugin when the Vite devtools setup hook runs first', async () => {
    const plugins = Unhead().vite() as any[]
    const devtools = plugins.find(plugin => plugin?.name === '@unhead/devtools')

    await devtools.devtools.setup({})
    await expect(devtools.load('/@unhead/bridge.mjs')).resolves.toBe('bridge')

    expect(devtoolsState.instances).toBe(1)
    expect(devtoolsState.calls).toEqual([
      'setup',
      'load:/@unhead/bridge.mjs',
    ])
  })
})
