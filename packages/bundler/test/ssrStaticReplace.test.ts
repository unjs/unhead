import { describe, expect, it } from 'vitest'
import { SSRStaticReplace } from '../src/unplugin/SSRStaticReplace'

function createPlugin(env: { isSsrBuild?: boolean, command?: string } = {}) {
  const plugin = SSRStaticReplace.vite({}) as any
  // simulate vite calling apply()
  plugin.applied = plugin.apply({}, { isSsrBuild: env.isSsrBuild ?? false, command: env.command ?? 'build' })
  return plugin
}

function environmentContext(consumer: 'client' | 'server') {
  return { environment: { config: { consumer } } }
}

function transform(plugin: any, code: string, id: string, ctx: any = {}) {
  if (plugin.transformInclude && !plugin.transformInclude(id))
    return undefined
  const handler = typeof plugin.transform === 'function' ? plugin.transform : plugin.transform.handler
  return handler.call(ctx, code, id)
}

const UNHEAD_MODULE_ID = '/node_modules/@unhead/vue/dist/index.mjs'
const USER_MODULE_ID = '/src/app.js'

describe('ssrStaticReplace', () => {
  it('only transforms unhead modules', () => {
    const plugin = createPlugin()
    expect(plugin.transformInclude(UNHEAD_MODULE_ID)).toBe(true)
    expect(plugin.transformInclude(USER_MODULE_ID)).toBe(false)
    expect(plugin.transformInclude('/node_modules/unhead/dist/index.mjs')).toBe(true)
    expect(plugin.transformInclude('/src/components/Head.vue')).toBe(false)
  })

  it('replaces head.ssr with false for client builds', () => {
    const plugin = createPlugin({ isSsrBuild: false, command: 'build' })
    const result = transform(plugin, 'if (head.ssr) { doServerThing() }', UNHEAD_MODULE_ID)
    expect(result?.code).toContain('if (false)')
  })

  it('replaces head.ssr with true for SSR builds', () => {
    const plugin = createPlugin({ isSsrBuild: true, command: 'build' })
    const result = transform(plugin, 'if (head.ssr) { doServerThing() }', UNHEAD_MODULE_ID)
    expect(result?.code).toContain('if (true)')
  })

  it('preserves head.ssr mutation targets while replacing reads', () => {
    const plugin = createPlugin({ isSsrBuild: false, command: 'build' })
    const code = [
      'head.ssr = false;',
      'head.ssr ||= true;',
      'head.ssr++;',
      'delete head.ssr;',
      'for (head.ssr in source) {}',
      'if (head.ssr) use(head.ssr);',
    ].join('\n')
    const result = transform(plugin, code, UNHEAD_MODULE_ID)

    expect(result?.code).toBe([
      'head.ssr = false;',
      'head.ssr ||= true;',
      'head.ssr++;',
      'delete head.ssr;',
      'for (head.ssr in source) {}',
      'if (false) use(false);',
    ].join('\n'))
  })

  it('preserves head.ssr reads nested inside mutation targets', () => {
    const plugin = createPlugin({ isSsrBuild: true, command: 'build' })
    const result = transform(plugin, 'head.ssr.value = 1; use(head.ssr);', UNHEAD_MODULE_ID)

    expect(result?.code).toBe('head.ssr.value = 1; use(true);')
  })

  it('should not apply in dev mode (vite serve)', () => {
    // in dev mode, head.ssr should NOT be statically replaced because both
    // SSR and client environments share the same vite dev server. The plugin
    // opts out entirely via apply() so the runtime value of head.ssr is
    // preserved: SSR renders use head.push() while client renders use
    // clientUseHead().
    const plugin = createPlugin({ isSsrBuild: false, command: 'serve' })
    expect(plugin.applied).toBe(false)
  })

  it('retains head.ssr when the build target is unknown (plain rollup)', () => {
    // no vite apply()/webpack() hook has fired and no environment is
    // available: replacing head.ssr with either value could corrupt the
    // build, so the source must be left untouched.
    const plugin = SSRStaticReplace.vite({}) as any
    const result = transform(plugin, 'if (head.ssr) { doServerThing() }', UNHEAD_MODULE_ID)
    expect(result).toBeUndefined()
  })

  it('resolves the target per environment on a shared plugin instance', () => {
    const plugin = SSRStaticReplace.vite({}) as any
    expect(plugin.sharedDuringBuild).toBe(true)

    const code = 'if (head.ssr) { doServerThing() }'
    const client = transform(plugin, code, UNHEAD_MODULE_ID, environmentContext('client'))
    const server = transform(plugin, code, UNHEAD_MODULE_ID, environmentContext('server'))
    const clientAgain = transform(plugin, code, UNHEAD_MODULE_ID, environmentContext('client'))

    expect(client?.code).toContain('if (false)')
    expect(server?.code).toContain('if (true)')
    expect(clientAgain?.code).toContain('if (false)')
  })

  it('environment consumer takes precedence over the apply() fallback', () => {
    const plugin = createPlugin({ isSsrBuild: false, command: 'build' })
    const result = transform(plugin, 'if (head.ssr) { doServerThing() }', UNHEAD_MODULE_ID, environmentContext('server'))
    expect(result?.code).toContain('if (true)')
  })
})
