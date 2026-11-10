import type { HeadPlugin, Unhead } from '../../../src/types'
import { describe, expect, it } from 'vitest'
import { compileTags, createHead, getRenderTier, renderSSRHead } from '../../../src/compiled/server'
import { withTagTransform } from '../../../src/plugins/defineHeadPlugin'
import { InferSeoMetaPlugin } from '../../../src/plugins/inferSeoMetaPlugin'
import { TemplateParamsPlugin } from '../../../src/plugins/templateParams'
import { createHead as createV3Head, renderSSRHead as renderV3 } from '../../../src/server'

const input = { title: 'Home', meta: [{ property: 'og:image', content: '/og.png' }] }
const compile = (value: unknown) => (compileTags(value) as any).tags
const tags = compile(input)

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

// adds an og:image, which changes the twitter:card that InferSeoMetaPlugin infers
function addImage(head: Unhead<any>): HeadPlugin {
  return withTagTransform(head, {
    key: 'add-image',
    transform: list => [...list, { tag: 'meta', props: { property: 'og:image', content: 'https://a.com/added.png' } } as any],
  })
}

// writes a template param into the title
function paramTitle(head: Unhead<any>): HeadPlugin {
  return withTagTransform(head, {
    key: 'param-title',
    transform: list => list.map(tag => tag.tag === 'title' ? { ...tag, textContent: `${tag.textContent} %site` } : tag),
  })
}

describe('tag transforms', () => {
  it('render the same on the compiled server head as on v3', () => {
    const v3 = createV3Head({ disableDefaults: true, plugins: [absoluteImages('https://a.com', { n: 0 })] })
    v3.push(input)
    const compiled = createHead({ disableDefaults: true, plugins: [absoluteImages('https://a.com', { n: 0 })] })
    compiled.push(tags)
    expect(getRenderTier(compiled)).toEqual({ _tag: 'Memo' })
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
      expect(getRenderTier(head)).toEqual({ _tag: 'Fast', reason: 'the tag transform of the absolute-images plugin has a null cache key' })
      expect(renderSSRHead(head).headTags).toContain('https://c.com/og.png')
    }
    expect(calls.n).toBe(2)
  })

  it('run on the fast tier with a loose entry', () => {
    const v3 = createV3Head({ disableDefaults: true, plugins: [absoluteImages('https://a.com', { n: 0 })] })
    v3.push(input)
    v3.push({ link: [{ rel: 'icon', href: '/icon.png' }] })
    const compiled = createHead({ disableDefaults: true, plugins: [absoluteImages('https://a.com', { n: 0 })] })
    compiled.push(tags)
    compiled.push({ link: [{ rel: 'icon', href: '/icon.png' }] })
    expect(getRenderTier(compiled)._tag).toBe('Fast')
    expect(renderSSRHead(compiled)).toEqual(renderV3(v3))
  })

  // v3 runs the tags:afterResolve listeners in the order their plugins registered
  it.each([
    ['a transform before InferSeoMetaPlugin', () => [addImage, InferSeoMetaPlugin()]],
    ['a transform after InferSeoMetaPlugin', () => [InferSeoMetaPlugin(), addImage]],
    ['a transform before TemplateParamsPlugin', () => [paramTitle, TemplateParamsPlugin]],
    ['a transform after TemplateParamsPlugin', () => [TemplateParamsPlugin, paramTitle]],
  ])('keep the v3 order with %s', (_, plugins) => {
    const page = { title: 'Home', meta: [{ name: 'description', content: 'A page' }], templateParams: { site: 'Site' } }
    const v3 = createV3Head({ disableDefaults: true, plugins: plugins() })
    v3.push(page)
    const expected = renderV3(v3)
    const pageTags = compile(page)
    // the memo build, then a memo hit
    for (let i = 0; i < 2; i++) {
      const compiled = createHead({ disableDefaults: true, plugins: plugins() })
      compiled.push(pageTags)
      expect(getRenderTier(compiled)._tag).toBe('Memo')
      expect(renderSSRHead(compiled)).toEqual(expected)
    }
    // the fast tier
    const loose = createHead({ disableDefaults: true, plugins: plugins() })
    loose.push(page)
    expect(getRenderTier(loose)._tag).toBe('Fast')
    expect(renderSSRHead(loose)).toEqual(expected)
    // the full runtime, which runs a transform as a hook
    const full = createHead({ disableDefaults: true, plugins: plugins() })
    full.push(pageTags)
    full.hooks.hook('tags:resolve', () => {})
    expect(getRenderTier(full)._tag).toBe('Full')
    expect(renderSSRHead(full)).toEqual(expected)
  })

  it('hold a limited number of memos per page when the cache key comes from the request', () => {
    const pageTags = compile(input)
    const calls = new Map<string, { n: number }>()
    const render = (site: string) => {
      if (!calls.has(site))
        calls.set(site, { n: 0 })
      const head = createHead({ disableDefaults: true, plugins: [absoluteImages(site, calls.get(site)!)] })
      head.push(pageTags)
      expect(renderSSRHead(head).headTags).toContain(`content="${site}/og.png"`)
    }
    const runs = (site: string) => calls.get(site)!.n
    render('https://real.com')
    // a flood of hosts, with the real host still in use
    for (let i = 0; i < 200; i++) {
      render(`https://flood-${i}.com`)
      if (i % 8 === 0)
        render('https://real.com')
    }
    // the real host kept its memo through the flood
    expect(runs('https://real.com')).toBe(1)
    // an early host lost its memo, so the page does not hold one memo per host
    render('https://flood-0.com')
    expect(runs('https://flood-0.com')).toBe(2)
    // a recent host still has one
    render('https://flood-199.com')
    expect(runs('https://flood-199.com')).toBe(1)
  })
})
