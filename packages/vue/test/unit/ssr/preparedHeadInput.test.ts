import type { ReactiveHead } from '@unhead/vue'
import { createHead, prepareHeadInput, renderSSRHead } from '@unhead/vue/server'
import { TemplateParamsPlugin } from 'unhead/plugins'
import { describe, expect, it } from 'vitest'
import { createStreamableHead } from '../../../src/stream/server'

function appHead(): ReactiveHead {
  return {
    htmlAttrs: { lang: 'de' },
    title: 'App',
    titleTemplate: '%s %separator %siteName',
    templateParams: { separator: '|', siteName: 'My App' },
    meta: [{ name: 'description', content: 'app description' }],
    link: [{ rel: 'icon', href: '/favicon.ico' }],
  }
}

const prepared = prepareHeadInput(appHead())
const options = { disableDefaults: true, plugins: [TemplateParamsPlugin] }

describe('vue ssr prepared head input', () => {
  it('vueResolver keeps the fast path for prepared init entries', () => {
    const fast = createHead({ ...options, init: [prepared] })
    const slow = createHead({ ...options, init: [appHead()] })
    expect(fast.entries.get(1)?._precomputedTags).toBeDefined()
    expect(slow.entries.get(1)?._precomputedTags).toBeUndefined()
    for (const head of [fast, slow])
      head.push({ title: 'Page' })
    expect(renderSSRHead(fast)).toEqual(renderSSRHead(slow))
    expect(renderSSRHead(fast).headTags).toContain('<title>Page | My App</title>')
  })

  it('applies to vue streamable heads', () => {
    const { head } = createStreamableHead({ ...options, init: [prepared] })
    expect(head.entries.get(1)?._precomputedTags).toBeDefined()
    expect(renderSSRHead(head).headTags).toContain('<title>App | My App</title>')
    expect(renderSSRHead(head)).toEqual(renderSSRHead(createStreamableHead({ ...options, init: [appHead()] }).head))
  })
})
