import { describe, expect, it } from 'vitest'
import { SSRStaticReplace } from '../src/unplugin/SSRStaticReplace'

function createPlugin(env: { isSsrBuild?: boolean, command?: string } = {}) {
  const plugin = SSRStaticReplace.vite({}) as any
  // simulate vite calling apply()
  plugin.apply({}, { isSsrBuild: env.isSsrBuild ?? false, command: env.command ?? 'build' })
  return plugin
}

function transform(plugin: any, code: string, id: string) {
  if (plugin.transformInclude && !plugin.transformInclude(id))
    return undefined
  return plugin.transform(code, id)
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

  it('should not apply in dev mode (vite serve)', () => {
    const plugin = createPlugin({ isSsrBuild: false, command: 'serve' })
    // in dev mode, head.ssr should NOT be statically replaced because both
    // SSR and client environments share the same vite dev server. The runtime
    // value of head.ssr must be preserved so SSR renders use head.push()
    // while client renders use clientUseHead().
    const result = transform(plugin, 'if (head.ssr) { doServerThing() }', UNHEAD_MODULE_ID)
    expect(result).toBeUndefined()
  })
})
