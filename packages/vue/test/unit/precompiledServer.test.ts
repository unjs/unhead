import type { PrecompiledHeadInput } from 'unhead/precompiled/server'
import { renderToString } from '@vue/server-renderer'
import { describe, expect, it } from 'vitest'
import { createSSRApp, defineComponent, h } from 'vue'
import { createHead as createNeutralHead, useHead as useNeutralHead } from '../../src/precompiled'
import { createHead, renderSSRHead, useHead, useSeoMeta } from '../../src/precompiled/server'

function compiled(input: PrecompiledHeadInput): never {
  return input as never
}

describe('precompiled Vue adapters', () => {
  it('fails loudly when the neutral API reaches runtime', () => {
    expect(() => createNeutralHead()).toThrow('A precompiled API reached the runtime')
    expect(() => useNeutralHead({ title: 'uncompiled' })).toThrow('A precompiled API reached the runtime')
  })

  it('installs, injects, and retains server plans without component cleanup', async () => {
    const head = createHead({ disableDefaults: true })
    const app = createSSRApp(defineComponent({
      setup() {
        useHead(compiled([[10, 'title', '<title>Server</title>']]))
        useSeoMeta(compiled([[100, 'meta:description', '<meta name="description" content="sealed">']]))
        return () => h('div')
      },
    }))
    app.use(head)

    await renderToString(app)
    expect(head._p).toHaveLength(2)
    expect(renderSSRHead(head).headTags).toBe('<title>Server</title><meta name="description" content="sealed">')
  })

  it('routes an explicit { head } without injection', () => {
    const head = createHead({ disableDefaults: true })
    useHead(compiled([[10, 'title', '<title>Explicit</title>']]), { head })
    expect(renderSSRHead(head).headTags).toBe('<title>Explicit</title>')
  })
})
