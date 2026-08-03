/**
 * The gate that makes the benchmarks meaningful: v4 must produce the same
 * SSR payload as v3 for the shared workload, across all three input paths
 * (runtime objects, compiled plans + dynamic tail, sealed plan with holes).
 */
import { describe, expect, it } from 'vitest'
import { createHead as createV3, renderSSRHead as renderV3 } from '../packages/unhead/src/server'
import { createHead as createV4, renderSSRHead as renderV4 } from '../packages/unhead/src/v4/server'
import { applyPage, DYNAMIC_ENTRIES, SEALED_FILLS, SEALED_PAGE_PLAN, SIMPLE, STATIC_PLANS } from './v4/fixtures'

function v3Render(apply: (push: (input: any, opts?: any) => void) => void) {
  const head = createV3()
  apply((input, opts) => head.push(input, opts))
  return renderV3(head, { omitLineBreaks: true })
}

function v4Render(apply: (push: (input: any, opts?: any) => void) => void) {
  const head = createV4()
  apply((input, opts) => head.push(input, opts))
  return renderV4(head)
}

describe('v4 ssr parity with v3', () => {
  it('typical page: runtime object path matches v3', () => {
    const a = v3Render(applyPage)
    const b = v4Render(applyPage)
    expect(b.htmlAttrs).toBe(a.htmlAttrs)
    expect(b.bodyAttrs).toBe(a.bodyAttrs)
    expect(b.bodyTagsOpen).toBe(a.bodyTagsOpen)
    expect(b.bodyTags).toBe(a.bodyTags)
    expect(b.headTags).toBe(a.headTags)
  })

  it('typical page: compiled plans + dynamic tail matches object path', () => {
    const a = v4Render(applyPage)
    const b = v4Render((push) => {
      for (const plan of STATIC_PLANS) push(plan)
      for (const [input, opts] of DYNAMIC_ENTRIES) push(input, opts)
    })
    expect(b).toEqual(a)
  })

  it('sealed route plan with holes matches object path', () => {
    const a = v4Render(applyPage)
    const b = v4Render(push => push(SEALED_PAGE_PLAN, { fills: SEALED_FILLS }))
    expect(b).toEqual(a)
  })

  it('simple page matches v3', () => {
    const a = v3Render(push => push(SIMPLE))
    const b = v4Render(push => push(SIMPLE))
    expect(b).toEqual({ ...a })
  })

  it('patch and dispose', () => {
    const head = createV4()
    const entry = head.push({ title: 'A' })
    expect(renderV4(head).headTags).toContain('<title>A</title>')
    entry.patch({ title: 'B' })
    expect(renderV4(head).headTags).toContain('<title>B</title>')
    entry.dispose()
    expect(renderV4(head).headTags).not.toContain('<title>')
  })

  it('repeated renders are stable (entry caches never mutated)', () => {
    const head = createV4()
    applyPage((input, opts) => head.push(input, opts))
    const first = renderV4(head)
    for (let i = 0; i < 5; i++) renderV4(head)
    expect(renderV4(head)).toEqual(first)
    expect(first.headTags).toContain('<title>About · Harlan Wilton</title>')
  })

  it('hole fills escape by mode', () => {
    const head = createV4({ disableDefaults: true })
    head.push([
      [10, 'title', ['<title>', '</title>'], 0b00],
      [100, 'meta:description', ['<meta name="description" content="', '">'], 0b01],
    ], { fills: ['a <b> & c', 'say "hi"'] })
    const out = renderV4(head).headTags
    expect(out).toBe('<title>a &lt;b> &amp; c</title><meta name="description" content="say &quot;hi&quot;">')
  })

  it('content-only script/style (no props) matches v3', () => {
    // regression: identity() used to throw on tags with null props
    const input = {
      script: ['console.log(1)', { innerHTML: 'console.log(2)' }],
      style: ['body{color:red}', { textContent: '.a{margin:0}' }],
    }
    const a = v3Render(push => push(input))
    const b = v4Render(push => push(input))
    expect(b.headTags).toBe(a.headTags)
  })

  it('identical inline scripts dedupe by content like v3', () => {
    const apply = (push: (input: any) => void) => {
      push({ script: ['console.log(1)'] })
      push({ script: ['console.log(1)'] })
    }
    const a = v3Render(apply)
    const b = v4Render(apply)
    expect(b.headTags).toBe(a.headTags)
  })
})
