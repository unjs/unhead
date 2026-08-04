import type { EntryOptions } from '../packages/unhead/src/v4/core'
import { describe, expect, it } from 'vitest'
import { emitSSRRoutePlan, hole } from '../packages/unhead/src/v4/emit'
import { createHead, renderSSRHead } from '../packages/unhead/src/v4/server'
import { renderSSRRoutePlan } from '../packages/unhead/src/v4/server-plans'

function direct(entries: [Record<string, any>, EntryOptions?][]) {
  return renderSSRRoutePlan(emitSSRRoutePlan(entries).plan)
}

function runtime(entries: [Record<string, any>, EntryOptions?][]) {
  const head = createHead()
  for (const [input, opts] of entries)
    head.push(input, opts)
  return renderSSRHead(head)
}

describe('v4 direct SSR performance audit', () => {
  it.each([
    ['false ordinary attrs', [[{ htmlAttrs: { hidden: false }, bodyAttrs: { inert: false } }]]],
    ['boolean and numeric attrs', [[{ htmlAttrs: { hidden: true, tabindex: 0 }, bodyAttrs: { inert: true } }]]],
    ['quote escaped attrs', [[{ htmlAttrs: { title: 'say "hi"' }, bodyAttrs: { title: 'a"b' } }]]],
    ['class and style across entries', [
      [{ htmlAttrs: { class: ['a', 'b'], style: { color: 'red', margin: 0 } } }],
      [{ htmlAttrs: { class: { c: true }, style: 'padding:0' } }],
    ]],
    ['all body positions', [[{
      script: [
        { src: '/open.js', tagPosition: 'bodyOpen' },
        { src: '/close.js', tagPosition: 'bodyClose' },
      ],
    }]]],
    ['json and text escape edge cases', [[{
      title: '<>&"\'/',
      script: [{ type: 'application/ld+json', innerHTML: { value: '<\\"' } }],
    }]]],
    ['default replacement', [[{
      htmlAttrs: { lang: 'fr' },
      meta: [
        { charset: 'iso-8859-1' },
        { name: 'viewport', content: 'width=900' },
      ],
    }]]],
  ] as [string, [Record<string, any>, EntryOptions?][]][])('%s', (_name, entries) => {
    expect(direct(entries)).toEqual(runtime(entries))
  })

  it('preserves attribute order and last-wins semantics', () => {
    const entries: [Record<string, any>, EntryOptions?][] = [
      [{ htmlAttrs: { lang: 'en', dir: 'ltr', class: 'a' } }],
      [{ htmlAttrs: { lang: 'fr', class: 'b' } }],
    ]
    expect(direct(entries)).toEqual(runtime(entries))
  })

  it('preserves private-use characters that resemble emitter hole tokens', () => {
    const entries: [Record<string, any>, EntryOptions?][] = [
      [{ title: 'literal \uE0000\uE000 token', meta: [{ name: 'description', content: '\uE0001\uE000' }] }],
    ]
    expect(direct(entries)).toEqual(runtime(entries))
  })

  it.each([
    ['', 'href=""'],
    ['true', 'href="true"'],
    ['42', 'href="42"'],
    ['say "hi"', 'href="say &quot;hi&quot;"'],
  ])('treats %j as string interpolation, without loose-input attr coercion', (value, html) => {
    const emitted = emitSSRRoutePlan([[{ link: [{ key: 'dynamic', rel: 'alternate', href: hole() }] }]])
    expect(renderSSRRoutePlan(emitted.plan, [value]).headTags).toContain(html)
  })

  it('keeps a real hole distinct from literal private-use token text', () => {
    const emitted = emitSSRRoutePlan([[
      { title: 'literal \uE0000\uE000', meta: [{ name: 'description', content: hole() }] },
    ]])
    expect(renderSSRRoutePlan(emitted.plan, ['filled']).headTags)
      .toContain('<title>literal \uE0000\uE000</title><meta name="description" content="filled">')
  })
})
