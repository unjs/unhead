/**
 * Reclaim semantics for the flat stride-3 effects encoding: the lockstep
 * prefix/suffix diff plus seen-set middle must only undo effects that were
 * not re-applied this render. These cases exercise the divergent-middle
 * paths that the shared parity workload does not.
 */
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import { createHead } from '../packages/unhead/src/v4/client'

const BLANK = '<!DOCTYPE html><html><head></head><body></body></html>'

function make() {
  const dom = new JSDOM(BLANK)
  const doc = dom.window.document
  const head = createHead({ document: doc, scheduler: () => {} })
  return { doc, head }
}

describe('v4 client reclaim', () => {
  it('disposing a middle entry removes only its effects', () => {
    const { doc, head } = make()
    head.push({ meta: [{ name: 'a', content: '1' }], script: [{ src: '/a.js' }] })
    const mid = head.push({ meta: [{ name: 'b', content: '2' }], link: [{ rel: 'stylesheet', href: '/x.css' }] })
    head.push({ meta: [{ name: 'c', content: '3' }] })
    head.render()
    expect(doc.head.children.length).toBe(5)
    mid.dispose()
    head.render()
    expect(doc.querySelector('meta[name=b]')).toBeNull()
    expect(doc.querySelector('link')).toBeNull()
    expect(doc.querySelector('meta[name=a]')?.getAttribute('content')).toBe('1')
    expect(doc.querySelector('meta[name=c]')?.getAttribute('content')).toBe('3')
    expect(doc.querySelector('script[src="/a.js"]')).toBeTruthy()
  })

  it('patching a class token undoes only the dropped token', () => {
    const { doc, head } = make()
    const entry = head.push({ htmlAttrs: { class: 'a b c', lang: 'en' } })
    head.render()
    expect(doc.documentElement.className).toBe('a b c')
    entry.patch({ htmlAttrs: { class: 'a d c', lang: 'en' } })
    head.render()
    expect([...doc.documentElement.classList].sort()).toEqual(['a', 'c', 'd'])
    expect(doc.documentElement.getAttribute('lang')).toBe('en')
  })

  it('removing a prop from a kept element undoes just that attr', () => {
    const { doc, head } = make()
    const entry = head.push({ script: [{ 'src': '/a.js', 'defer': true, 'data-x': '1', 'key': 'k' }] })
    head.render()
    const el = doc.querySelector('script')!
    expect(el.hasAttribute('defer')).toBe(true)
    entry.patch({ script: [{ 'src': '/a.js', 'data-x': '2', 'key': 'k' }] })
    head.render()
    expect(doc.querySelector('script')).toBe(el) // same element kept
    expect(el.hasAttribute('defer')).toBe(false)
    expect(el.getAttribute('data-x')).toBe('2')
    expect(el.getAttribute('src')).toBe('/a.js')
  })

  it('duplicate positional tags survive disposing the first owner', () => {
    const { doc, head } = make()
    // src-only scripts have no dedupe identity (d === ''), so both render and
    // share a hash base; disposing the first shifts the survivor onto key 0
    const first = head.push({ script: [{ src: '/dup.js' }] })
    head.push({ script: [{ src: '/dup.js' }] })
    head.render()
    expect(doc.querySelectorAll('script').length).toBe(2)
    first.dispose()
    head.render()
    const scripts = doc.querySelectorAll('script')
    expect(scripts.length).toBe(1)
    expect(scripts[0].getAttribute('src')).toBe('/dup.js')
  })

  it('event listeners rebind on handler change and detach on dispose', () => {
    const { doc, head } = make()
    const calls: string[] = []
    const h1 = () => calls.push('h1')
    const h2 = () => calls.push('h2')
    const entry = head.push({ script: [{ src: '/a.js', onload: h1, key: 'k' }] })
    head.render()
    const el = doc.querySelector('script')!
    el.dispatchEvent(new (doc.defaultView as any).Event('load'))
    expect(calls).toEqual(['h1'])
    entry.patch({ script: [{ src: '/a.js', onload: h2, key: 'k' }] })
    head.render()
    el.dispatchEvent(new (doc.defaultView as any).Event('load'))
    expect(calls).toEqual(['h1', 'h2'])
    entry.dispose()
    head.render()
    el.dispatchEvent(new (doc.defaultView as any).Event('load'))
    expect(calls).toEqual(['h1', 'h2'])
  })

  it('interleaved dispose keeps re-applied effects between two change points', () => {
    const { doc, head } = make()
    // low-weight script sorts before the metas, so its effects sit between
    // the divergence points when both ends change
    const a = head.push({ meta: [{ name: 'aa', content: '1' }] }, { tagPriority: 10 })
    head.push({ script: [{ src: '/keep.js', defer: true }] })
    const b = head.push({ meta: [{ name: 'zz', content: '9' }] }, { tagPriority: 200 })
    head.render()
    a.dispose()
    b.dispose()
    head.render()
    expect(doc.querySelector('meta[name=aa]')).toBeNull()
    expect(doc.querySelector('meta[name=zz]')).toBeNull()
    const keep = doc.querySelector('script[src="/keep.js"]')!
    expect(keep).toBeTruthy()
    expect(keep.hasAttribute('defer')).toBe(true)
  })
})
