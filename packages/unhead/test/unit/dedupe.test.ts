import { dedupeKey, hashTag, isMetaArrayDupeKey } from '../../src/utils/dedupe'

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
      props: { rel: 'alternate', href: '/feed.xml' },
    })).toBe('link:alternate:/feed.xml')
    expect(dedupeKey({
      tag: 'link',
      props: { rel: 'alternate', type: 'application/rss+xml', href: '/feed.xml' },
    })).toBe('link:alternate:/feed.xml')
  })

  it('respects explicit keys on typed alternate links', () => {
    expect(dedupeKey({
      tag: 'link',
      key: 'rss-feed',
      props: { rel: 'alternate', type: 'application/rss+xml', href: '/feed.xml' },
    })).toBe('link:key:rss-feed')
  })

  it('keeps semantic link singleton identities', () => {
    expect(dedupeKey({
      tag: 'link',
      props: { rel: 'canonical', href: '/one' },
    })).toBe('canonical')
    expect(dedupeKey({
      tag: 'link',
      props: { rel: 'canonical', href: '/two' },
    })).toBe('canonical')
    expect(dedupeKey({
      tag: 'link',
      props: { rel: 'alternate', hreflang: 'en', href: '/one' },
    })).toBe('alternate:en')
    expect(dedupeKey({
      tag: 'link',
      props: { rel: 'alternate', hreflang: 'en', href: '/two' },
    })).toBe('alternate:en')
  })
})

describe('hashTag', () => {
  it('serializes fallback tag props in sorted order', () => {
    expect(hashTag({
      tag: 'link',
      props: {
        rel: 'stylesheet',
        href: '/_nuxt/app.css',
        crossorigin: true as any,
      },
    })).toBe('link:crossorigin:true,href:/_nuxt/app.css,rel:stylesheet')
    // prop order must not affect the hash (#823)
    expect(hashTag({
      tag: 'script',
      props: { defer: true as any, src: '/app.js' },
    })).toBe(hashTag({
      tag: 'script',
      props: { src: '/app.js', defer: true as any },
    }))
  })

  it('ignores inherited props', () => {
    const props = Object.create({ inherited: 'ignored' })
    props.src = '/_nuxt/app.js'
    expect(hashTag({ tag: 'script', props })).toBe('script:src:/_nuxt/app.js')
  })

  it('preserves the empty props fallback', () => {
    expect(hashTag({ tag: 'link', props: {} })).toBe('link:')
  })

  it('preserves explicit tag identities', () => {
    expect(hashTag({ tag: 'script', props: {}, _h: 'hash' })).toBe('hash')
    expect(hashTag({ tag: 'meta', props: {}, _d: 'dedupe' })).toBe('dedupe')
    expect(hashTag({ tag: 'style', props: {}, innerHTML: 'body{}' })).toBe('body{}')
  })
})
