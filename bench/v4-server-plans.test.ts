import { describe, expect, it } from 'vitest'
import { emitRoutePayload, emitRoutePlan, emitSSRRoutePlan, hole, payloadToCode, PlanEmitError } from '../packages/unhead/src/v4/emit'
import { createHead, renderSSRHead } from '../packages/unhead/src/v4/server'
import { renderSSRRoutePlan } from '../packages/unhead/src/v4/server-plans'
import { applyPage, ENTRIES } from './v4/fixtures'

describe('direct sealed route SSR', () => {
  it('renders the typical route byte-identically without a head instance', () => {
    const entries = ENTRIES.map(([input, opts]) => [input, opts] as [Record<string, any>, typeof opts])
    const emitted = emitSSRRoutePlan(entries)
    const head = createHead()
    applyPage((input, opts) => head.push(input, opts))

    expect(renderSSRRoutePlan(emitted.plan)).toEqual(renderSSRHead(head))
    expect(JSON.stringify(emitted.plan).length).toBeLessThan(JSON.stringify(emitRoutePlan(entries).plan).length * 0.75)
  })

  it('fills dynamic text, attributes, and JSON with the wire escape modes', () => {
    const emitted = emitSSRRoutePlan([
      [{ meta: [{ name: 'description', content: hole() }] }],
      [{ title: hole() }],
      [{ script: [{ type: 'application/ld+json', key: 'schema', innerHTML: { value: hole() } }] }],
    ])
    expect(emitted.fillOrder).toEqual([1, 0, 2])

    const direct = renderSSRRoutePlan(emitted.plan, ['A <title>', 'say "hello"', '<json>'])
    expect(direct.headTags).toContain('<title>A &lt;title&gt;</title>')
    expect(direct.headTags).toContain('content="say &quot;hello&quot;"')
    expect(direct.headTags).toContain('{"value":"\\u003Cjson>"}')
  })

  it('merges precompiled class and style fragments into one attribute each', () => {
    const emitted = emitSSRRoutePlan([
      [{ htmlAttrs: { class: 'dark mode-a', style: 'color:red' } }],
      [{ htmlAttrs: { class: 'compact', style: 'margin:0' }, bodyAttrs: { class: 'page' } }],
    ])
    const direct = renderSSRRoutePlan(emitted.plan)

    expect(direct.htmlAttrs).toContain('class="dark mode-a compact"')
    expect(direct.htmlAttrs).toContain('style="color:red;margin:0"')
    expect(direct.htmlAttrs.match(/class=/g)).toHaveLength(1)
    expect(direct.bodyAttrs).toBe(' class="page"')
  })

  it('emits a static route as a final payload with no runtime renderer', () => {
    const entries = ENTRIES.map(([input, opts]) => [input, opts] as [Record<string, any>, typeof opts])
    const payload = emitRoutePayload(entries)
    const head = createHead()
    applyPage((input, opts) => head.push(input, opts))

    expect(payload).toEqual(renderSSRHead(head))
    expect(JSON.parse(payloadToCode(payload))).toEqual(payload)
  })

  it('includes defaults unless the route explicitly disables them', () => {
    const withDefaults = renderSSRRoutePlan(emitSSRRoutePlan([]).plan)
    const withoutDefaults = renderSSRRoutePlan(emitSSRRoutePlan([], { disableDefaults: true }).plan)

    expect(withDefaults.headTags).toContain('<meta charset="utf-8">')
    expect(withDefaults.headTags).toContain('name="viewport"')
    expect(withoutDefaults.headTags).toBe('')
  })

  it('rejects a runtime hole from the zero-runtime payload path', () => {
    expect(() => emitRoutePayload([[{ title: hole() }]])).toThrow(PlanEmitError)
  })
})
