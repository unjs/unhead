/**
 * Candidate 2: ssrRenderAttrs replacing propsToString via the serializer seam.
 * The seam itself must be output-neutral (default serializer == v4/server),
 * and the vue-backed serializer's divergences must be pinned exactly.
 */
import { describe, expect, it } from 'vitest'
import { createHead as createV4, renderSSRHead as renderV4 } from '../../../packages/unhead/src/v4/server'
import { applyPage, SEALED_FILLS, SEALED_PAGE_PLAN } from '../../v4/fixtures'
import { renderSSRHead as renderSeam, renderSSRHeadWith } from './proto/server-seam'
import { vueSerializer } from './proto/vue-attrs'

function heads() {
  const head = createV4()
  applyPage((input, opts) => head.push(input, opts))
  return head
}

describe('serializer seam neutrality', () => {
  it('default serializer is byte-identical to v4/server renderSSRHead (typical page)', () => {
    const head = heads()
    expect(renderSeam(head)).toEqual(renderV4(head))
  })

  it('default serializer is byte-identical on the sealed plan path', () => {
    const head = createV4()
    head.push(SEALED_PAGE_PLAN, { fills: SEALED_FILLS })
    expect(renderSeam(head)).toEqual(renderV4(head))
  })
})

describe('vue serializer divergences (why parity fails)', () => {
  it('typical page: vue serializer output is NOT byte-identical', () => {
    const head = heads()
    const ours = renderV4(head)
    const vue = renderSSRHeadWith(head, vueSerializer)
    expect(vue.headTags).not.toBe(ours.headTags)
  })

  it('boolean coercion: compiled `crossorigin: true` renders crossorigin="true" under vue', () => {
    // v4 compile coerces '' and 'true' to boolean true; propsToString emits a
    // bare attr for ANY true. ssrRenderAttrs only bare-renders attrs on vue's
    // isBooleanAttr allowlist; crossorigin is not on it.
    const head = createV4({ disableDefaults: true })
    head.push({ link: [{ rel: 'preload', as: 'fetch', href: '/p.json', crossorigin: '' }] })
    expect(renderSeam(head).headTags).toContain(' crossorigin>')
    expect(renderSSRHeadWith(head, vueSerializer).headTags).toContain(' crossorigin="true">')
  })

  it('attr escaping: vue escapes & in attr values, v4/v3 escape quotes only', () => {
    const head = createV4({ disableDefaults: true })
    head.push({ link: [{ rel: 'canonical', href: 'https://x.com/?a=1&b=2' }] })
    expect(renderSeam(head).headTags).toContain('href="https://x.com/?a=1&b=2"')
    expect(renderSSRHeadWith(head, vueSerializer).headTags).toContain('href="https://x.com/?a=1&amp;b=2"')
  })

  it('dual-path break: sealed-plan attr fragments double-escape through vue', () => {
    // plan attr fragments arrive pre-escaped (&quot;); the seam re-parses them
    // into a prop bag, and vue's escapeHtml re-escapes the & of &quot;
    const head = createV4({ disableDefaults: true })
    head.push([[100, 'htmlAttrs:data-x', ' data-x="say &quot;hi&quot;"', 3]])
    expect(renderSeam(head).htmlAttrs).toBe(' data-x="say &quot;hi&quot;"')
    expect(renderSSRHeadWith(head, vueSerializer).htmlAttrs).toBe(' data-x="say &amp;quot;hi&amp;quot;"')
  })

  it('title text: apostrophes render as &#39; under vue, &#x27; under v4', () => {
    const head = createV4({ disableDefaults: true })
    head.push({ title: 'Tom\'s page' })
    expect(renderSeam(head).headTags).toBe('<title>Tom&#x27;s page</title>')
    expect(renderSSRHeadWith(head, vueSerializer).headTags).toBe('<title>Tom&#39;s page</title>')
  })

  it('unsafe attr names: vue silently drops them, v4 renders as-is', () => {
    const head = createV4({ disableDefaults: true })
    // v3/v4 contract: input sanitizing is the app's job at this layer
    head.push({ meta: [{ 'name': 'x', 'content': 'y', 'bad>name': 'v' }] })
    expect(renderSeam(head).headTags).toContain('bad>name="v"')
    expect(renderSSRHeadWith(head, vueSerializer).headTags).not.toContain('bad>name')
  })
})
