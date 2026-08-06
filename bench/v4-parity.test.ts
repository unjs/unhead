/**
 * The gate that makes the benchmarks meaningful: v4 must produce the same
 * SSR payload as v3 for the shared workload, across all three input paths
 * (runtime objects, compiled plans + dynamic tail, sealed plan with holes).
 */
import { describe, expect, it } from 'vitest'
import { createHead as createV3, renderSSRHead as renderV3 } from '../packages/unhead/src/server'
import { emitEntryPlan } from '../packages/unhead/src/v4/emit'
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
    // text mode matches the SSR title escaping contract (& < > " ' /)
    expect(out).toBe('<title>a &lt;b&gt; &amp; c</title><meta name="description" content="say &quot;hi&quot;">')
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

  it('sealed htmlAttrs class fragment + runtime class push merge into one class attribute', () => {
    const sealedInput = { htmlAttrs: { class: 'dark mode-a' } }
    const runtime = { htmlAttrs: { class: 'compact' } }
    const a = v4Render((push) => {
      push(sealedInput)
      push(runtime)
    })
    const b = v4Render((push) => {
      push(emitEntryPlan(sealedInput).plan)
      push(runtime)
    })
    expect(b.htmlAttrs).toBe(a.htmlAttrs)
    expect(b.htmlAttrs.match(/class=/g)).toHaveLength(1)
    expect(b.htmlAttrs).toContain('class="dark mode-a compact"')
  })

  it('sealed vs runtime attr dedupe matches runtime-vs-runtime (token overlap, style override)', () => {
    const sealedInput = { htmlAttrs: { class: 'dark mode-a', style: 'color:red' }, bodyAttrs: { class: 'antialiased' } }
    const runtime = { htmlAttrs: { class: 'dark compact', style: 'color:blue' }, bodyAttrs: { class: 'antialiased' } }
    const a = v4Render((push) => {
      push(sealedInput)
      push(runtime)
    })
    const b = v4Render((push) => {
      push(emitEntryPlan(sealedInput).plan)
      push(runtime)
    })
    expect(b.htmlAttrs).toBe(a.htmlAttrs)
    expect(b.bodyAttrs).toBe(a.bodyAttrs)
    // class union dedupes tokens, later entry wins the style property
    expect(b.htmlAttrs).toContain('class="dark mode-a compact"')
    expect(b.htmlAttrs).toContain('style="color:blue"')
    expect(b.bodyAttrs).toBe(' class="antialiased"')
  })

  it('sealed title + runtime titleTemplate templates the inner text (B1)', () => {
    const head = createV4({ disableDefaults: true })
    head.push(emitEntryPlan({ title: 'About' }).plan)
    head.push({ titleTemplate: '%s · Acme' })
    expect(renderV4(head).headTags).toBe('<title>About · Acme</title>')
  })

  it('sealed hole-filled title + runtime titleTemplate re-escapes correctly', () => {
    const head = createV4({ disableDefaults: true })
    head.push([[10, 'title', ['<title>', '</title>'], 0]], { fills: ['A & B <C>'] })
    head.push({ titleTemplate: '%s · Acme' })
    expect(renderV4(head).headTags).toBe('<title>A &amp; B &lt;C&gt; · Acme</title>')
  })

  it('sealed title without a template stays prebuilt and publishes the raw text', () => {
    const head = createV4({ disableDefaults: true })
    head.push(emitEntryPlan({ title: 'A & B' }).plan)
    let seen: unknown
    head.use({ key: 'probe', resolve: ctx => seen = ctx.shared.title })
    expect(renderV4(head).headTags).toBe('<title>A &amp; B</title>')
    expect(seen).toBe('A & B')
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
