import { describe, expect, it } from 'vitest'
import { createHead, defineStaticEntry, renderSSRHead } from '../../../src/server'
import { resolveTags } from '../../../src/utils'

describe('static entries', () => {
  it('renders identically to the plain-object equivalent', () => {
    const input: import('../../../src/types').ResolvableHead = {
      title: 'My Site',
      meta: [
        { name: 'description', content: 'hello' },
        { property: 'og:image', content: '/a.png' },
      ],
      link: [{ rel: 'stylesheet', href: '/app.css' }],
    }
    const plain = createHead()
    plain.push(structuredClone(input))
    const staticEntry = defineStaticEntry(structuredClone(input))
    const shared = createHead()
    shared.push(staticEntry as any)
    expect(renderSSRHead(shared)).toStrictEqual(renderSSRHead(plain))
  })

  it('shares the exact tag objects across heads at the same entry index', () => {
    const entry = defineStaticEntry({ meta: [{ name: 'description', content: 'shared' }] })
    const a = createHead({ disableDefaults: true })
    const b = createHead({ disableDefaults: true })
    a.push(entry as any)
    b.push(entry as any)
    const ta = resolveTags(a)
    const tb = resolveTags(b)
    expect(ta[0]).toBe(tb[0])
    expect(Object.isFrozen(ta[0])).toBe(true)
    expect(Object.isFrozen(ta[0].props)).toBe(true)
  })

  it('default server init is shared across heads', () => {
    const a = createHead()
    const b = createHead()
    const ca = resolveTags(a).find(t => t.props.charset)
    const cb = resolveTags(b).find(t => t.props.charset)
    expect(ca).toBeDefined()
    expect(ca).toBe(cb)
  })

  it('static entries can still be overridden by regular entries', () => {
    const head = createHead()
    head.push({ meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' }] })
    const { headTags } = renderSSRHead(head)
    expect(headTags).toContain('maximum-scale=1')
    expect(headTags.match(/name="viewport"/g)).toHaveLength(1)
  })

  it('entry options produce per-head shells with adjusted weight', () => {
    const entry = defineStaticEntry({ meta: [{ name: 'description', content: 'x' }] })
    const head = createHead({ disableDefaults: true })
    head.push(entry as any, { tagPriority: 1 })
    const other = createHead({ disableDefaults: true })
    other.push(entry as any)
    const t = resolveTags(head)[0]
    const o = resolveTags(other)[0]
    expect(t).not.toBe(o)
    expect(t._w).toBe(1)
    expect(t.tagPriority).toBe(1)
  })

  it('patching a static entry falls back to regular normalization', () => {
    const entry = defineStaticEntry({ title: 'static' })
    const head = createHead({ disableDefaults: true })
    const active = head.push(entry as any)
    expect(renderSSRHead(head).headTags).toContain('static')
    active.patch({ title: 'patched' })
    expect(renderSSRHead(head).headTags).toContain('patched')
  })

  it('normalizes only once per process across many heads', () => {
    const entry = defineStaticEntry({ meta: [{ name: 'description', content: 'once' }] }) as any
    for (let i = 0; i < 5; i++) {
      const head = createHead({ disableDefaults: true })
      head.push(entry)
      renderSSRHead(head)
    }
    expect(entry._c.tags).toHaveLength(1)
    expect(entry._c.byIndex.size).toBe(1)
  })
})
