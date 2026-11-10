import type { HeadPlugin, Unhead } from '../../../src/types'
import { describe, expect, it } from 'vitest'
import { dynamicValue } from '../../../src/compiled'
import { compileTags, createHead, getRenderTier, renderSSRHead } from '../../../src/compiled/server'
import { FLAG_UNDEFINED_DROPS } from '../../../src/compiled/tags'
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

  it('keep a tags:afterResolve listener that the plugin already has', () => {
    const plugin = (head: Unhead<any>): HeadPlugin => withTagTransform(head, {
      key: 'listener-and-transform',
      hooks: {
        'tags:afterResolve': (ctx) => {
          ctx.tags.push({ tag: 'meta', props: { name: 'from', content: 'listener' } })
        },
      },
      transform: list => [...list, { tag: 'meta', props: { name: 'also-from', content: 'transform' } } as any],
    })
    const v3 = createV3Head({ disableDefaults: true, plugins: [plugin] })
    v3.push(input)
    expect(renderV3(v3).headTags).toContain('<meta name="from" content="listener">\n<meta name="also-from" content="transform">')
    // the fast tiers run a transform only, so the listener keeps the full runtime
    const compiled = createHead({ disableDefaults: true, plugins: [plugin] })
    compiled.push(tags)
    expect(getRenderTier(compiled)._tag).toBe('Full')
    expect(renderSSRHead(compiled)).toEqual(renderV3(v3))
  })

  it('run a transform once when a plugin is wrapped twice', () => {
    const calls = { n: 0 }
    const head = createV3Head({ disableDefaults: true, plugins: [(head: Unhead<any>) => withTagTransform(head, absoluteImages('https://a.com', calls)(head))] })
    head.push(input)
    renderV3(head)
    expect(calls.n).toBe(1)
    // a plugin with its own listener gets a hook that the fast tiers do not know
    const own = { n: 0 }
    const listening = (head: Unhead<any>): HeadPlugin => withTagTransform(head, withTagTransform(head, {
      key: 'listener-and-transform',
      hooks: { 'tags:afterResolve': () => {} },
      transform: (list) => {
        own.n++
        return list
      },
    }))
    const withListener = createV3Head({ disableDefaults: true, plugins: [listening] })
    withListener.push(input)
    renderV3(withListener)
    expect(own.n).toBe(1)
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
      expect(getRenderTier(head)).toEqual({ _tag: 'Fast', reason: 'the tag transform of the absolute-images plugin gives no cache key' })
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

  it('keep one memo for each order of a transform and InferSeoMetaPlugin', () => {
    const page = { title: 'Home', meta: [{ name: 'description', content: 'A page' }] }
    const pageTags = compile(page)
    for (const plugins of [() => [addImage, InferSeoMetaPlugin()], () => [InferSeoMetaPlugin(), addImage]]) {
      const v3 = createV3Head({ disableDefaults: true, plugins: plugins() })
      v3.push(page)
      const compiled = createHead({ disableDefaults: true, plugins: plugins() })
      compiled.push(pageTags)
      expect(getRenderTier(compiled)._tag).toBe('Memo')
      expect(renderSSRHead(compiled)).toEqual(renderV3(v3))
    }
  })

  it('keep the memos of two transforms apart when a cache key holds the separator', () => {
    const pageTags = compile(input)
    // adds a meta tag that holds its cache key
    const stamp = (key: string, value: string) => (head: Unhead<any>): HeadPlugin => withTagTransform(head, {
      key,
      transform: list => [...list, { tag: 'meta', props: { name: key, content: value } } as any],
      cacheKey: () => value,
    })
    const render = (a: string, b: string) => {
      const head = createHead({ disableDefaults: true, plugins: [stamp('a', a), stamp('b', b)] })
      head.push(pageTags)
      return renderSSRHead(head).headTags
    }
    expect(render('x|b:y', 'z')).toContain('<meta name="b" content="z">')
    expect(render('x', 'y|b:z')).toContain('<meta name="b" content="y|b:z">')
  })

  it('omit a tag whose value is undefined when a transform replaced its text', () => {
    const result = compileTags({ title: 'Home', meta: [{ name: 'description', content: dynamicValue(0) }] }, { valueCount: 1 }) as any
    // the build marks a `useSeoMeta` tag that v3 omits for an undefined value
    result.tags.find((tag: any) => tag[0] === 'meta')[5] |= FLAG_UNDEFINED_DROPS
    const fixedDescription = (cacheKey: string | null) => (head: Unhead<any>): HeadPlugin => withTagTransform(head, {
      key: 'fixed-description',
      transform: list => list.map(tag => tag.props.name === 'description' ? { ...tag, props: { ...tag.props, content: 'Fixed' } } : tag),
      cacheKey: () => cacheKey,
    })
    const render = (value: unknown, cacheKey: string | null) => {
      const head = createHead({ disableDefaults: true, plugins: [fixedDescription(cacheKey)] })
      head.push(result.tags, { values: [value] } as any)
      return renderSSRHead(head).headTags
    }
    expect(render('Text', 'site')).toContain('<meta name="description" content="Fixed">')
    // a null cache key renders with no memo
    expect(render(undefined, null)).toBe('<title>Home</title>')
    expect(render(undefined, 'site')).toBe('<title>Home</title>')
  })

  it('render a dynamic value that a transform moved into a class', () => {
    const result = compileTags({ title: dynamicValue(0) }, { valueCount: 1 }) as any
    const titleClass = (cacheKey: string | null) => (head: Unhead<any>): HeadPlugin => withTagTransform(head, {
      key: 'title-class',
      transform: list => [...list, { tag: 'htmlAttrs', props: { class: new Set([list.find(tag => tag.tag === 'title')!.textContent]) } } as any],
      cacheKey: () => cacheKey,
    })
    const render = (value: string, cacheKey: string | null) => {
      const head = createHead({ disableDefaults: true, plugins: [titleClass(cacheKey)] })
      head.push(result.tags, { values: [value] } as any)
      return renderSSRHead(head).htmlAttrs
    }
    // a null cache key renders with no memo
    expect(render('home', null)).toBe(' class="home"')
    expect(render('home', 'site')).toBe(' class="home"')
    expect(render('about', 'site')).toBe(' class="about"')
  })

  it('resolve a template param in a dynamic value that a transform moved into raw text', () => {
    const result = compileTags({ templateParams: { site: 'World' }, meta: [{ name: 'description', content: dynamicValue(0) }] }, { valueCount: 1 }) as any
    const toNoscript = (cacheKey: string | null) => (head: Unhead<any>): HeadPlugin => withTagTransform(head, {
      key: 'to-noscript',
      transform: list => list.map(tag => tag.props.name === 'description' ? { ...tag, tag: 'noscript', props: {}, innerHTML: tag.props.content } as any : tag),
      cacheKey: () => cacheKey,
    })
    const render = (value: string, cacheKey: string | null) => {
      const head = createHead({ disableDefaults: true, plugins: [TemplateParamsPlugin, toNoscript(cacheKey)] })
      head.push(result.tags, { values: [value] } as any)
      return renderSSRHead(head).headTags
    }
    // a null cache key renders with no memo
    expect(render('Hello %site', null)).toBe('<noscript>Hello World</noscript>')
    expect(render('Hello', 'site')).toBe('<noscript>Hello</noscript>')
    expect(render('Hello %site', 'site')).toBe('<noscript>Hello World</noscript>')
  })

  it('render with no memo when a cache key is undefined', () => {
    const calls = { n: 0 }
    for (let i = 0; i < 2; i++) {
      const head = createHead({ disableDefaults: true, plugins: [absoluteImages('https://a.com', calls, () => undefined as any)] })
      head.push(tags)
      expect(getRenderTier(head)._tag).toBe('Fast')
      expect(renderSSRHead(head).headTags).toContain('content="https://a.com/og.png"')
    }
    expect(calls.n).toBe(2)
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
