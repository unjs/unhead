import { JSDOM } from 'jsdom'
import { compileTags, createHead, dynamicValue, getRenderTier, renderSSRHead } from 'unhead/compiled/server'
import { resolveTags } from 'unhead/utils'
import { describe, expect, it } from 'vitest'

describe('root attribute entity preservation', () => {
  it.each([
    ['Memo', false],
    ['Memo', true],
    ['Fast', false],
    ['Fast', true],
    ['Full', false],
    ['Full', true],
  ] as const)('preserves JSON in %s, dynamic: %s', (tier, dynamic) => {
    const json = JSON.stringify({ text: '&quot; &amp; &#34; " < >' })
    const result = compileTags({
      htmlAttrs: { 'data-state': dynamic ? dynamicValue(0) : json },
      bodyAttrs: { 'data-state': dynamic ? dynamicValue(0) : json },
    }, { dynamicValues: dynamic ? 1 : 0 })
    if (result._tag !== 'Ok')
      throw new Error(result.reason)
    for (let request = 0; request < 2; request++) {
      const head = createHead({ disableDefaults: true })
      head.push(result.tags, { values: [json] })
      if (tier === 'Fast')
        head.push({ title: 'Loose' })
      if (tier === 'Full')
        head.hooks.hook('tags:resolve', () => {})
      expect(getRenderTier(head)._tag).toBe(tier)
      const html = renderSSRHead(head)
      const dom = new JSDOM(`<html${html.htmlAttrs}><head>${html.headTags}</head><body${html.bodyAttrs}></body></html>`)
      expect(dom.window.document.documentElement.getAttribute('data-state')).toBe(json)
      expect(dom.window.document.body.getAttribute('data-state')).toBe(json)
      dom.window.close()
    }
  })
})

describe('replacement SEO plugin request isolation', () => {
  it.each(['tags:beforeResolve', 'tags:afterResolve'] as const)('isolates mutations from %s', (hook) => {
    const result = compileTags({ meta: [{ name: 'description', content: 'Original description' }] })
    if (result._tag !== 'Ok')
      throw new Error(result.reason)
    const mutate = ({ tags }: any) => {
      tags.find((tag: any) => tag.props.name === 'description').props.content = 'Request marker'
    }
    const replacement = Object.assign(() => ({
      key: 'infer-seo-meta',
      hooks: {
        'tags:beforeResolve': Object.assign(hook === 'tags:beforeResolve' ? mutate : () => {}, { _plain: true }),
        'tags:afterResolve': hook === 'tags:afterResolve' ? mutate : () => {},
      },
    }), { key: 'infer-seo-meta' })
    const first = createHead({ disableDefaults: true, plugins: [replacement] })
    first.push(result.tags)
    first.push({ title: 'Loose' })
    expect(renderSSRHead(first).headTags).toContain('content="Request marker"')

    for (const tier of ['Fast', 'Memo', 'Full'] as const) {
      const later = createHead({ disableDefaults: true })
      later.push(result.tags)
      if (tier === 'Fast')
        later.push({ title: 'Loose' })
      if (tier === 'Full')
        later.hooks.hook('tags:resolve', () => {})
      expect(getRenderTier(later)._tag).toBe(tier)
      expect(renderSSRHead(later).headTags).toContain('content="Original description"')
      expect(resolveTags(later).find(tag => tag.props.name === 'description')?.props.content).toBe('Original description')
    }
  })
})
