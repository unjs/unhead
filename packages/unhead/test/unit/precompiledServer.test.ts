import type { PrecompiledHeadInput } from '../../src/precompiled/server'
import { describe, expect, it } from 'vitest'
import { createHead, renderSSRHead, resolveTags } from '../../src/precompiled/server'
import { createHead as createNormalHead, renderSSRHead as renderNormalSSRHead } from '../../src/server'

describe('sealed precompiled server runtime', () => {
  it('renders build-finalized plans', () => {
    const head = createHead({ disableDefaults: true })
    head._p.push([
      [10, 'title', '<title>strict</title>'],
      [100, 'meta:description', '<meta name="description" content="compiled">'],
    ])
    expect(renderSSRHead(head).headTags).toBe('<title>strict</title><meta name="description" content="compiled">')
  })

  it('uses the package-owned precompiled defaults', () => {
    const rendered = renderSSRHead(createHead())
    expect(rendered).toEqual(renderNormalSSRHead(createNormalHead(), { omitLineBreaks: true }))
    expect(rendered.htmlAttrs).toBe(' lang="en"')
    expect(rendered.headTags).toBe('<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">')
  })

  it('dedupes by priority and same-priority execution order', () => {
    const head = createHead({ disableDefaults: true })
    head._p.push([
      [100, 'meta:description', '<meta name="description" content="first">'],
      [20, 'canonical', '<link rel="canonical" href="/best">'],
    ])
    head._p.push([
      [100, 'meta:description', '<meta name="description" content="last">'],
      [100, 'canonical', '<link rel="canonical" href="/ignored">'],
    ])
    expect(renderSSRHead(head).headTags).toBe('<link rel="canonical" href="/best"><meta name="description" content="last">')
  })

  it('routes pre-rendered fragments without a runtime serializer', () => {
    const head = createHead({ disableDefaults: true })
    head._p.push([
      [100, 'htmlAttrs:lang', ' lang="en-AU"', 3],
      [100, 'bodyAttrs:class', ' class="page"', 4],
      [100, 'script:open', '<script src="/open.js"></script>', 1],
      [100, 'script:close', '<script src="/close.js"></script>', 2],
    ])
    expect(renderSSRHead(head)).toEqual({
      headTags: '',
      bodyTags: '<script src="/close.js"></script>',
      bodyTagsOpen: '<script src="/open.js"></script>',
      htmlAttrs: ' lang="en-AU"',
      bodyAttrs: ' class="page"',
    })
  })

  it('exposes only build-plan resolution', () => {
    const head = createHead({ disableDefaults: true })
    const plan: PrecompiledHeadInput = [[10, 'title', '<title>resolved</title>']]
    head._p.push(plan)
    expect(resolveTags(head)).toEqual(plan)
  })

  it('memoizes repeat renders of a shared plan with fresh payload objects', () => {
    const plan: PrecompiledHeadInput = [[10, 'title', '<title>a</title>'], [100, 'meta:x', '<meta name="x" content="1">']]
    const first = createHead({ disableDefaults: true })
    first._p.push(plan)
    const second = createHead({ disableDefaults: true })
    second._p.push(plan)
    const firstPayload = renderSSRHead(first)
    // cached path: same strings, distinct payload objects
    expect(renderSSRHead(first)).toEqual(firstPayload)
    expect(renderSSRHead(first)).not.toBe(firstPayload)
    expect(renderSSRHead(second)).toEqual(firstPayload)
    // resolveTags keeps returning a mutable fresh array over the shared cache
    const resolved = resolveTags(first)
    resolved.pop()
    expect(resolveTags(first)).toHaveLength(2)
  })

  it('memoizes the defaults + plan shape and re-renders after a later push', () => {
    const plan: PrecompiledHeadInput = [[10, 'title', '<title>a</title>']]
    const withDefaults = createHead()
    withDefaults._p.push(plan)
    const expected = renderSSRHead(withDefaults)
    expect(expected.headTags).toContain('<title>a</title>')
    expect(expected.htmlAttrs).toBe(' lang="en"')
    // repeat render hits the pair cache
    expect(renderSSRHead(withDefaults)).toEqual(expected)
    // a second head with the same plans shares the cached strings
    const other = createHead()
    other._p.push(plan)
    expect(renderSSRHead(other)).toEqual(expected)
    // a later push bypasses the cache and re-renders correctly
    withDefaults._p.push([[100, 'meta:x', '<meta name="x" content="1">']])
    const updated = renderSSRHead(withDefaults)
    expect(updated.headTags).toContain('<meta name="x" content="1">')
    expect(updated.headTags).toContain('<title>a</title>')
    // and the cached defaults + plan payload is unaffected
    expect(renderSSRHead(other)).toEqual(expected)
  })
})

describe('dynamic slots', () => {
  it('interpolates server bindings with context escaping', () => {
    const head = createHead({ disableDefaults: true })
    const plan: PrecompiledHeadInput = [
      [10, 'title', '<title>\x01T0\x01</title>'],
      [100, 'meta:description', '<meta name="description" content="\x01A1\x01">'],
    ]
    head._p.push([plan, [() => 'Widget "Pro"', () => 'A <widget> & more'] as any])
    // title text: full escapeHtml; attribute: quote-only, matching static propsToString
    expect(renderSSRHead(head).headTags).toBe('<title>Widget &quot;Pro&quot;</title><meta name="description" content="A <widget> & more">')
  })

  it('renders slotted output identical to the normal runtime for escaping cases', () => {
    const values = { title: 'Widget "Pro"', desc: 'A <widget> & more' }
    const slotted = createHead({ disableDefaults: true })
    slotted._p.push([
      [
        [10, 'title', '<title>\x01T0\x01</title>'],
        [100, 'meta:description', '<meta name="description" content="\x01A1\x01">'],
      ] as PrecompiledHeadInput,
      [() => values.title, () => values.desc] as any,
    ])
    const normal = createNormalHead({ disableDefaults: true })
    normal.push({ title: values.title, meta: [{ name: 'description', content: values.desc }] })
    expect(renderSSRHead(slotted).headTags).toBe(renderNormalSSRHead(normal, { omitLineBreaks: true }).headTags)
  })

  it('null and false slot values render empty', () => {
    const head = createHead({ disableDefaults: true })
    head._p.push([[[10, 'title', '<title>\x01T0\x01</title>']] as PrecompiledHeadInput, [() => null] as any])
    expect(renderSSRHead(head).headTags).toBe('<title></title>')
  })

  it('static plans keep memoizing while slotted plans re-evaluate', () => {
    let counter = 0
    const head = createHead({ disableDefaults: true })
    head._p.push([[[10, 'title', '<title>\x01T0\x01</title>']] as PrecompiledHeadInput, [() => `n${++counter}`] as any])
    expect(renderSSRHead(head).headTags).toBe('<title>n1</title>')
    expect(renderSSRHead(head).headTags).toBe('<title>n2</title>')
  })

  it('resolves tags without interpolating (resolveTags stays tokenized)', () => {
    const head = createHead({ disableDefaults: true })
    head._p.push([[[10, 'title', '<title>\x01T0\x01</title>']] as PrecompiledHeadInput, [() => 'x'] as any])
    expect(resolveTags(head)[0][2]).toBe('<title>\x01T0\x01</title>')
  })
})
