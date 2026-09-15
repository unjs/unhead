import { dedupeKey, hashTag, isMetaArrayDupeKey } from '../../src/utils/dedupe'
import { normalizeEntryToTags } from '../../src/utils/normalize'

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

  // JSON-LD (and other object innerHTML) is serialized with JSON.stringify, which
  // preserves insertion order, so two logically identical payloads with differently
  // ordered keys must still fingerprint identically at every nesting depth.
  it('gives object innerHTML a hash that is stable across key insertion order, at any nesting depth', () => {
    const [a] = normalizeEntryToTags({ script: [{ type: 'application/ld+json', innerHTML: { '@type': 'Organization', 'name': 'Acme', 'address': { city: 'Sydney', country: 'AU' } } }] }, [])
    const [b] = normalizeEntryToTags({ script: [{ type: 'application/ld+json', innerHTML: { 'address': { country: 'AU', city: 'Sydney' }, 'name': 'Acme', '@type': 'Organization' } }] }, [])
    expect(hashTag(a)).toBe(hashTag(b))
    expect(dedupeKey(a)).toBe(dedupeKey(b))
  })

  it('keeps array order significant inside object innerHTML', () => {
    const [a] = normalizeEntryToTags({ script: [{ type: 'application/ld+json', innerHTML: { items: [1, 2] } }] }, [])
    const [b] = normalizeEntryToTags({ script: [{ type: 'application/ld+json', innerHTML: { items: [2, 1] } }] }, [])
    expect(hashTag(a)).not.toBe(hashTag(b))
    expect(dedupeKey(a)).not.toBe(dedupeKey(b))
  })
})

describe('canonical json identity across the ssr boundary', () => {
  const LD = { '@type': 'Organization', 'name': 'Acme', 'address': { city: 'Sydney', country: 'AU' } }

  it('adopts the server-rendered block instead of adding a second', async () => {
    const { JSDOM } = await import('jsdom')
    const { createHead: createClientHead } = await import('../../src/client')
    const { createHead: createServerHead } = await import('../../src/server')

    const ssr = createServerHead({ disableDefaults: true })
    ssr.push({ script: [{ type: 'application/ld+json', innerHTML: LD as any }] })
    const doc = new JSDOM(`<!DOCTYPE html><html><head>${(await ssr.render()).headTags}</head><body></body></html>`).window.document

    const client = createClientHead({ document: doc })
    client.push({ script: [{ type: 'application/ld+json', innerHTML: LD as any }] })
    await client.render()

    expect(doc.querySelectorAll('script[type="application/ld+json"]')).toHaveLength(1)
  })
})
