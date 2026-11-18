import type { HeadPlugin, Unhead } from '../../../src/types'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { compileTags } from '../../../src/compiled'
import { createHead, renderSSRHead } from '../../../src/compiled/server'
import { withTagTransform } from '../../../src/plugins/defineHeadPlugin'
import { createHead as createV3Head, renderSSRHead as renderV3 } from '../../../src/server'

const tags = (compileTags({ title: 'Home', meta: [{ property: 'og:image', content: '/og.png' }] }) as any).tags

// makes the og:image absolute, as a site URL module does
function absoluteImages(site: string, calls: { n: number }, cacheKey?: (ctx: any) => string | null) {
  return (head: Unhead<any>): HeadPlugin => withTagTransform(head, {
    key: 'absolute-images',
    transform: (list) => {
      calls.n++
      return list.map(tag => tag.tag === 'meta' && tag.props.property === 'og:image' ? { ...tag, props: { ...tag.props, content: site + tag.props.content } } : tag)
    },
    cacheKey: cacheKey || (() => site),
  })
}

describe('tag transforms', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('render the same on the compiled server head as on v3', () => {
    const v3 = createV3Head({ disableDefaults: true, plugins: [absoluteImages('https://a.com', { n: 0 })] })
    v3.push({ title: 'Home', meta: [{ property: 'og:image', content: '/og.png' }] })
    const compiled = createHead({ disableDefaults: true, plugins: [absoluteImages('https://a.com', { n: 0 })] })
    compiled.push(tags)
    expect(renderSSRHead(compiled)).toEqual(renderV3(v3))
    expect(renderSSRHead(compiled).headTags).toContain('content="https://a.com/og.png"')
  })

  it('keep the memo, keyed by the cache key', () => {
    const render = (site: string, calls: { n: number }) => {
      const head = createHead({ disableDefaults: true, plugins: [absoluteImages(site, calls)] })
      head.push(tags)
      return renderSSRHead(head).headTags
    }
    const a = { n: 0 }
    const b = { n: 0 }
    expect(render('https://memo-a.com', a)).toContain('https://memo-a.com/og.png')
    expect(render('https://memo-a.com', a)).toContain('https://memo-a.com/og.png')
    expect(render('https://b.com', b)).toContain('https://b.com/og.png')
    expect(render('https://b.com', b)).toContain('https://b.com/og.png')
    // one run per cache key: the second render of each site is a memo hit
    expect([a.n, b.n]).toEqual([1, 1])
  })

  it('skip the memo for a null cache key', () => {
    const calls = { n: 0 }
    for (let i = 0; i < 2; i++) {
      const head = createHead({ disableDefaults: true, plugins: [absoluteImages('https://c.com', calls, () => null)] })
      head.push(tags)
      renderSSRHead(head)
    }
    expect(calls.n).toBe(2)
  })

  it('warn about a transform that is not pure in a debug build', () => {
    vi.stubGlobal('__UNHEAD_COMPILE_DEBUG__', true)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    let n = 0
    const head = createHead({ disableDefaults: true, plugins: [(h: Unhead<any>) => withTagTransform(h, { key: 'counter', transform: list => [...list, { tag: 'meta', props: { name: 'n', content: String(n++) } } as any], cacheKey: () => null })] })
    head.push(tags)
    renderSSRHead(head)
    expect(warn).toHaveBeenCalledWith('[unhead] tag transform counter is not pure')
    warn.mockRestore()
  })
})
