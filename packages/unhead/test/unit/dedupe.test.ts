import type { HeadTag } from 'unhead/types'
import type { ResolveTagsContext } from 'unhead/utils'
import { ssrRenderTags } from 'unhead/server'
import { dedupeKey, dedupeTags, hashTag, isMetaArrayDupeKey } from 'unhead/utils'

it.each([false, true])('merges legacy body attributes with a prefilled map: %s', (prefilled) => {
  const first: HeadTag = {
    tag: 'bodyAttrs',
    props: { class: new Set(['app']) as any, style: new Map([['color', 'red']]) as any, id: 'root' },
    _d: 'bodyAttrs',
    _w: 100,
    _p: 0,
  }
  const next: HeadTag = {
    tag: 'bodyAttrs',
    props: { 'class': new Set(['page']) as any, 'style': new Map([['background', 'blue']]) as any, 'data-page': 'home' },
    _d: 'bodyAttrs',
    _w: 100,
    _p: 1024,
  }
  const ctx: ResolveTagsContext = {
    tags: prefilled ? [next] : [first, next],
    tagMap: prefilled ? new Map([['bodyAttrs', first]]) : new Map(),
  }

  dedupeTags(ctx)

  expect(ssrRenderTags([...ctx.tagMap.values()]).bodyAttrs)
    .toBe(' class="app page" style="color:red;background:blue" id="root" data-page="home"')
})

it('derives identities from canonical attributes without a resolved props alias', () => {
  const tag = { tag: 'meta' as const, attrs: { name: 'description', content: 'Home' } }

  expect(dedupeKey(tag)).toBe('meta:description')
  expect(hashTag(tag)).toBe('meta:content:Home,name:description')
})

describe('isMetaArrayDupeKey', () => {
  it('rejects scalar Open Graph and Twitter metadata', () => {
    expect(isMetaArrayDupeKey('meta:og:title')).toBe(false)
    expect(isMetaArrayDupeKey('meta:og:description')).toBe(false)
    expect(isMetaArrayDupeKey('meta:article:section')).toBe(false)
    expect(isMetaArrayDupeKey('meta:book:isbn')).toBe(false)
    expect(isMetaArrayDupeKey('meta:profile:username')).toBe(false)
    expect(isMetaArrayDupeKey('meta:twitter:card')).toBe(false)
    expect(isMetaArrayDupeKey('meta:twitter:title')).toBe(false)
    expect(isMetaArrayDupeKey('meta:twitter:description')).toBe(false)
  })

  it('accepts repeatable metadata', () => {
    expect(isMetaArrayDupeKey('meta:theme-color')).toBe(true)
    expect(isMetaArrayDupeKey('meta:google-site-verification')).toBe(true)
    expect(isMetaArrayDupeKey('meta:author')).toBe(true)
    expect(isMetaArrayDupeKey('meta:og:locale:alternate')).toBe(true)
    expect(isMetaArrayDupeKey('meta:og:image')).toBe(true)
    expect(isMetaArrayDupeKey('meta:og:image:alt')).toBe(true)
    expect(isMetaArrayDupeKey('meta:og:audio:type')).toBe(true)
    expect(isMetaArrayDupeKey('meta:og:video:width')).toBe(true)
    expect(isMetaArrayDupeKey('meta:article:author')).toBe(true)
    expect(isMetaArrayDupeKey('meta:article:tag')).toBe(true)
    expect(isMetaArrayDupeKey('meta:book:author')).toBe(true)
    expect(isMetaArrayDupeKey('meta:book:tag')).toBe(true)
    expect(isMetaArrayDupeKey('meta:twitter:image')).toBe(true)
    expect(isMetaArrayDupeKey('meta:twitter:image:alt')).toBe(true)
  })
})

describe('dedupeKey', () => {
  it('uses rel + href for link identity regardless of other props', () => {
    expect(dedupeKey({
      tag: 'link',
      attrs: { rel: 'alternate', href: '/feed.xml' },
    })).toBe('link:alternate:/feed.xml')
    expect(dedupeKey({
      tag: 'link',
      attrs: { rel: 'alternate', type: 'application/rss+xml', href: '/feed.xml' },
    })).toBe('link:alternate:/feed.xml')
  })

  it('respects explicit keys on typed alternate links', () => {
    expect(dedupeKey({
      tag: 'link',
      key: 'rss-feed',
      attrs: { rel: 'alternate', type: 'application/rss+xml', href: '/feed.xml' },
    })).toBe('link:key:rss-feed')
  })

  it('keeps semantic link singleton identities', () => {
    expect(dedupeKey({
      tag: 'link',
      attrs: { rel: 'canonical', href: '/one' },
    })).toBe('canonical')
    expect(dedupeKey({
      tag: 'link',
      attrs: { rel: 'canonical', href: '/two' },
    })).toBe('canonical')
    expect(dedupeKey({
      tag: 'link',
      attrs: { rel: 'alternate', hreflang: 'en', href: '/one' },
    })).toBe('alternate:en')
    expect(dedupeKey({
      tag: 'link',
      attrs: { rel: 'alternate', hreflang: 'en', href: '/two' },
    })).toBe('alternate:en')
  })
})

describe('hashTag', () => {
  it('serializes fallback tag props in sorted order', () => {
    expect(hashTag({
      tag: 'link',
      attrs: {
        rel: 'stylesheet',
        href: '/_nuxt/app.css',
        crossorigin: true as any,
      },
    })).toBe('link:crossorigin:true,href:/_nuxt/app.css,rel:stylesheet')
    // prop order must not affect the hash (#823)
    expect(hashTag({
      tag: 'script',
      attrs: { defer: true as any, src: '/app.js' },
    })).toBe(hashTag({
      tag: 'script',
      attrs: { src: '/app.js', defer: true as any },
    }))
  })

  it('ignores inherited props', () => {
    const attrs = Object.create({ inherited: 'ignored' })
    attrs.src = '/_nuxt/app.js'
    expect(hashTag({ tag: 'script', attrs })).toBe('script:src:/_nuxt/app.js')
  })

  it('preserves the empty props fallback', () => {
    expect(hashTag({ tag: 'link', attrs: {} })).toBe('link:')
  })

  it('preserves explicit tag identities', () => {
    expect(hashTag({ tag: 'script', attrs: {}, _h: 'hash' })).toBe('hash')
    expect(hashTag({ tag: 'meta', attrs: {}, _d: 'dedupe' })).toBe('dedupe')
    expect(hashTag({ tag: 'style', attrs: {}, innerHTML: 'body{}' })).toBe('body{}')
  })

  it('returns a string for non-string text content', () => {
    expect(hashTag({ tag: 'meta', attrs: {}, textContent: 1 as any })).toBe('1')
    expect(hashTag({ tag: 'meta', attrs: {}, textContent: true as any })).toBe('true')
  })
})
