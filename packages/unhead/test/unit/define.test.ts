import { useHead } from '../../src/composables'
import { defineLink, defineScript } from '../../src/define'
import { createHead } from '../../src/server'

describe('defineLink', () => {
  it('accepts non-standard rel values without a cast', () => {
    const head = createHead()
    useHead(head, {
      link: [
        defineLink({ rel: 'openid2.provider', href: 'https://example.com/openid' }),
        defineLink({ rel: 'EditURI', href: '/rsd.xml', type: 'application/rsd+xml' }),
        defineLink({ rel: 'hub', href: 'https://pubsubhubbub.appspot.com/' }),
      ],
    })
  })

  it('accepts newly-added standard rels without defineLink', () => {
    const head = createHead()
    useHead(head, {
      link: [
        { rel: 'me', href: 'https://mastodon.social/@me' },
        { rel: 'webmention', href: '/webmention' },
        { rel: 'privacy-policy', href: '/privacy' },
        { rel: 'terms-of-service', href: '/terms' },
        { rel: 'expect', href: '#main', blocking: 'render' },
        { rel: 'compression-dictionary', href: '/dict.bin' },
        { rel: 'alternate stylesheet', href: '/dark.css', title: 'Dark theme' },
      ],
    })
  })

  it('enforces `title` on rel="alternate stylesheet"', () => {
    // @ts-expect-error AlternateStylesheetLink requires `title`
    defineLink({ rel: 'alternate stylesheet', href: '/dark.css' })
  })

  it('still enforces `as` on rel="preload"', () => {
    // @ts-expect-error PreloadLink requires `as`
    defineLink({ rel: 'preload', href: '/x.js' })
  })

  it('still enforces `crossorigin` on preload font', () => {
    // @ts-expect-error PreloadFontLink requires `crossorigin`
    defineLink({ rel: 'preload', href: '/font.woff2', as: 'font' })
  })

  it('still enforces `color` on rel="mask-icon"', () => {
    // @ts-expect-error MaskIconLink requires `color`
    defineLink({ rel: 'mask-icon', href: '/mask.svg' })
  })

  it('accepts valid known rel links unchanged', () => {
    const head = createHead()
    useHead(head, {
      link: [
        defineLink({ rel: 'stylesheet', href: '/style.css' }),
        defineLink({ rel: 'preload', href: '/font.woff2', as: 'font', crossorigin: 'anonymous' }),
        defineLink({ rel: 'icon', href: '/favicon.ico' }),
        defineLink({ rel: 'shortcut icon', href: '/favicon.ico' }),
        defineLink({ rel: 'canonical', href: 'https://example.com/' }),
        defineLink({ rel: 'mask-icon', href: '/mask.svg', color: '#000' }),
        defineLink({ rel: 'alternate', href: '/en', hreflang: 'en' }),
        defineLink({ rel: 'alternate', href: '/fallback' }),
        defineLink({ rel: 'alternate', href: '/feed.xml', type: 'application/rss+xml' }),
      ],
    })
  })

  it('accepts preload image with only imagesrcset (no href)', () => {
    defineLink({ rel: 'preload', as: 'image', imagesrcset: '/hero.jpg 1x, /hero@2x.jpg 2x' })
  })
})

describe('defineScript', () => {
  it('accepts custom type values without a cast', () => {
    const head = createHead()
    useHead(head, {
      script: [
        defineScript({ type: 'text/plain', textContent: 'debug-token' }),
        defineScript({ type: 'text/html', textContent: '<template>...</template>' }),
      ],
    })
  })

  it('still enforces `src` or inline content on rel="module"', () => {
    // Valid: module with src
    defineScript({ type: 'module', src: '/app.mjs' })
    // Valid: inline module with textContent
    defineScript({ type: 'module', textContent: 'export {}' })
    // @ts-expect-error module with neither src nor textContent/innerHTML
    defineScript({ type: 'module' })
  })

  it('still enforces inline content on rel="application/ld+json"', () => {
    // Valid
    defineScript({ type: 'application/ld+json', textContent: '{"@context":"https://schema.org"}' })
    // @ts-expect-error JsonLdScript requires textContent/innerHTML
    defineScript({ type: 'application/ld+json', src: '/ld.json' })
  })

  it('accepts valid known script types unchanged', () => {
    const head = createHead()
    useHead(head, {
      script: [
        defineScript({ src: '/app.js' }),
        defineScript({ type: 'module', src: '/app.mjs' }),
        defineScript({ type: 'application/ld+json', textContent: '{}' }),
        defineScript({ type: 'speculationrules', textContent: '{}' }),
        defineScript({ type: 'importmap', textContent: '{"imports":{}}' }),
      ],
    })
  })
})
