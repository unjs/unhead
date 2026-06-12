import { describe, expect, it } from 'vitest'
import { createHead } from '../../../src/server'
import { resolveTags } from '../../../src/utils'

function tagsToMap(head: any) {
  return Object.fromEntries(resolveTags(head).map(t => [`${t.tag}:${t.props.name || t.props.rel || ''}`, t.props.content || t.props.href || t.textContent]))
}

describe('incremental dedupe', () => {
  it('disposing an overriding entry reverts to the previous winner', () => {
    const head = createHead({ disableDefaults: true })
    head.push({ meta: [{ name: 'description', content: 'base' }] })
    const override = head.push({ meta: [{ name: 'description', content: 'override' }] })
    expect(tagsToMap(head)['meta:description']).toBe('override')
    override.dispose()
    expect(tagsToMap(head)['meta:description']).toBe('base')
  })

  it('patching an entry updates only its winner', () => {
    const head = createHead({ disableDefaults: true })
    head.push({ title: 'first' })
    const entry = head.push({ meta: [{ name: 'description', content: 'a' }] })
    expect(resolveTags(head).find(t => t.tag === 'title')!.textContent).toBe('first')
    entry.patch({ meta: [{ name: 'description', content: 'b' }] })
    expect(tagsToMap(head)['meta:description']).toBe('b')
    expect(resolveTags(head).find(t => t.tag === 'title')!.textContent).toBe('first')
  })

  it('higher priority entry pushed later wins, then loses on dispose', () => {
    const head = createHead({ disableDefaults: true })
    head.push({ title: 'low' })
    const high = head.push({ title: 'high' }, { tagPriority: 1 })
    expect(resolveTags(head).find(t => t.tag === 'title')!.textContent).toBe('high')
    high.dispose()
    expect(resolveTags(head).find(t => t.tag === 'title')!.textContent).toBe('low')
  })

  it('repeated resolves without changes return stable output', () => {
    const head = createHead()
    head.push({ title: 'x', meta: [{ name: 'description', content: 'd' }] })
    const a = resolveTags(head)
    const b = resolveTags(head)
    expect(b).toStrictEqual(a)
  })

  it('flat-meta same-entry duplicates survive patch cycles', () => {
    const head = createHead({ disableDefaults: true })
    const entry = head.push({ meta: [
      { property: 'og:image', content: '/a.png' },
      { property: 'og:image', content: '/b.png' },
    ] })
    expect(resolveTags(head).filter(t => t.props.property === 'og:image')).toHaveLength(2)
    entry.patch({ meta: [
      { property: 'og:image', content: '/c.png' },
    ] })
    const tags = resolveTags(head).filter(t => t.props.property === 'og:image')
    expect(tags).toHaveLength(1)
    expect(tags[0].props.content).toBe('/c.png')
  })

  it('merge strategy folds incrementally across patches', () => {
    const head = createHead({ disableDefaults: true })
    head.push({ htmlAttrs: { class: 'a', lang: 'en' } })
    const entry = head.push({ htmlAttrs: { class: 'b' } })
    let attrs = resolveTags(head).find(t => t.tag === 'htmlAttrs')!
    expect([...(attrs.props.class as any)]).toEqual(['a', 'b'])
    entry.patch({ htmlAttrs: { class: 'c' } })
    attrs = resolveTags(head).find(t => t.tag === 'htmlAttrs')!
    expect([...(attrs.props.class as any)]).toEqual(['a', 'c'])
    expect(attrs.props.lang).toBe('en')
  })

  it('disposed entries leave no retained dedupe state', () => {
    const head = createHead({ disableDefaults: true })
    const entries = Array.from({ length: 10 }, (_, i) => head.push({ meta: [{ name: `m${i}`, content: `${i}` }] }))
    resolveTags(head)
    entries.forEach(e => e.dispose())
    expect(resolveTags(head)).toHaveLength(0)
    const state = (head as any)._dq
    expect(state.buckets.size).toBe(0)
    expect(state.entryTags.size).toBe(0)
    expect(state.winners.size).toBe(0)
  })
})
