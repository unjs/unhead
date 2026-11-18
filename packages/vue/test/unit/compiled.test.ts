import { useHead, useSeoMeta } from '@unhead/vue'
import { useCompiledHead } from '@unhead/vue/compiled'
import { createHead as createCompiled, renderSSRHead as renderCompiled } from '@unhead/vue/compiled/server'
import { createHead as createV3, renderSSRHead as renderV3 } from '@unhead/vue/server'
import { renderToString } from '@vue/server-renderer'
import { compileTags, dynamicValue } from 'unhead/compiled'
import { TemplateParamsPlugin } from 'unhead/plugins'
import { describe, expect, it, vi } from 'vitest'
import { computed, createSSRApp, ref } from 'vue'

function compiledTags(input: any, dynamicValues?: number): any {
  const result = compileTags(input, { dynamicValues })
  if (result._tag !== 'Ok')
    throw new Error(result.reason)
  return result.tags
}

const appHead = {
  meta: [{ charset: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  titleTemplate: '%s %separator %siteName',
  templateParams: { siteName: 'Site' },
}
const page: any = { title: 'Page', link: [{ rel: 'canonical', href: 'https://example.com/a' }] }

async function ssr(head: any, setup: () => void) {
  const app = createSSRApp({
    setup,
    render: () => null,
  })
  app.use(head)
  await renderToString(app)
}

describe('useCompiledHead outside setup', () => {
  // a router guard or a store, for example
  it('throws the v3 error, with no Vue warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => useCompiledHead(compiledTags({ title: 'A' }))).toThrow('useHead() was called without provide context')
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('@unhead/vue/compiled/server', () => {
  it('equals @unhead/vue/server for compiled tags in a Vue app', async () => {
    const v3 = createV3({ plugins: [TemplateParamsPlugin], init: [appHead] })
    await ssr(v3, () => {
      useHead(page)
    })
    const head = createCompiled({ plugins: [TemplateParamsPlugin], init: [compiledTags(appHead)] })
    await ssr(head, () => {
      useHead(compiledTags(page))
    })
    expect(renderCompiled(head)).toEqual(renderV3(v3))
  })

  it('resolves refs and computed values in loose input beside compiled tags', async () => {
    const setup = () => {
      const title = ref('Ref title')
      useHead({ title, meta: [{ name: 'description', content: computed(() => `of ${title.value}`) }] })
      useSeoMeta({ ogTitle: title })
    }
    const v3 = createV3({ plugins: [TemplateParamsPlugin], init: [appHead] })
    await ssr(v3, setup)
    const head = createCompiled({ plugins: [TemplateParamsPlugin], init: [compiledTags(appHead)] })
    await ssr(head, setup)
    expect(renderCompiled(head)).toEqual(renderV3(v3))
    expect(renderCompiled(head).headTags).toContain('<title>Ref title | Site</title>')
  })

  it('passes values through useHead', async () => {
    const page = compiledTags({ title: dynamicValue(0) }, 1)
    const head = createCompiled({ disableDefaults: true })
    await ssr(head, () => {
      useHead(page, { values: ['Replaced'] } as any)
    })
    expect(renderCompiled(head).headTags).toBe('<title>Replaced</title>')
  })
})
