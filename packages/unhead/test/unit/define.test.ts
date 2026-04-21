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
        defineLink({ rel: 'x-custom-feed', href: '/feed.xml' }),
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
        { rel: 'sitemap', href: '/sitemap.xml', type: 'application/xml' },
        { rel: 'amphtml', href: '/amp/page' },
        { rel: 'hub', href: 'https://pubsubhubbub.appspot.com/' },
        { rel: 'apple-touch-startup-image', href: '/splash.png', media: '(device-width: 320px)' },
      ],
    })
  })

  it('enforces `href` on rel="sitemap"', () => {
    // @ts-expect-error SitemapLink requires `href`
    defineLink({ rel: 'sitemap' })
  })

  it('enforces `href` on rel="amphtml"', () => {
    // @ts-expect-error AmpHtmlLink requires `href`
    defineLink({ rel: 'amphtml' })
  })

  it('enforces `href` on rel="hub"', () => {
    // @ts-expect-error HubLink requires `href`
    defineLink({ rel: 'hub' })
  })

  it('enforces `href` on rel="apple-touch-startup-image"', () => {
    // @ts-expect-error AppleTouchStartupImageLink requires `href`
    defineLink({ rel: 'apple-touch-startup-image' })
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

  it('still enforces `src` or inline content on type="module"', () => {
    // Valid: module with src
    defineScript({ type: 'module', src: '/app.mjs' })
    // Valid: inline module with textContent
    defineScript({ type: 'module', textContent: 'export {}' })
    // @ts-expect-error module with neither src nor textContent/innerHTML
    defineScript({ type: 'module' })
  })

  it('still enforces inline content on type="application/ld+json"', () => {
    // Valid
    defineScript({ type: 'application/ld+json', textContent: '{"@context":"https://schema.org"}' })
    defineScript({ type: 'application/ld+json', innerHTML: '{"@context":"https://schema.org"}' })
    // @ts-expect-error JsonLdScript forbids src
    defineScript({ type: 'application/ld+json', src: '/ld.json' })
    // @ts-expect-error JsonLdScript requires textContent or innerHTML
    defineScript({ type: 'application/ld+json' })
  })

  it('enforces inline content on type="speculationrules"', () => {
    defineScript({ type: 'speculationrules', textContent: '{"prerender":[]}' })
    // @ts-expect-error SpeculationRulesScript requires textContent or innerHTML
    defineScript({ type: 'speculationrules' })
  })

  it('enforces inline content on type="application/json"', () => {
    defineScript({ type: 'application/json', textContent: '{}' })
    // @ts-expect-error ApplicationJsonScript requires textContent or innerHTML
    defineScript({ type: 'application/json' })
  })

  it('enforces inline content on type="importmap"', () => {
    defineScript({ type: 'importmap', textContent: '{"imports":{}}' })
    // @ts-expect-error ImportMapScript requires textContent or innerHTML
    defineScript({ type: 'importmap' })
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

  // Nuxt cross-origin-prefetch: speculationrules with structured innerHTML object
  it('accepts speculationrules with object innerHTML without defineScript', () => {
    const head = createHead()
    useHead(head, {
      script: [{
        type: 'speculationrules',
        key: 'speculationrules',
        innerHTML: {
          prefetch: [
            {
              source: 'list',
              urls: ['https://example.com'],
              requires: ['anonymous-client-ip-when-cross-origin'],
            },
          ],
        },
      }],
    })
  })

  // Nuxt importmap: structured innerHTML with imports object
  it('accepts importmap with object innerHTML without defineScript', () => {
    const head = createHead()
    useHead(head, {
      script: [{
        type: 'importmap',
        innerHTML: { imports: { '#entry': '/entry.mjs' } },
      }],
    })
  })

  // as const speculationrules should work directly with useHead
  it('accepts as const speculationrules directly in useHead', () => {
    const spec = {
      type: 'speculationrules',
      innerHTML: {
        prerender: [{ source: 'list', urls: ['/next-page'] }],
      },
    } as const
    const head = createHead()
    useHead(head, { script: [spec] })
  })

  // as const importmap should work directly with useHead
  it('accepts as const importmap directly in useHead', () => {
    const map = {
      type: 'importmap',
      innerHTML: { imports: { '#entry': '/entry.mjs' } },
    } as const
    const head = createHead()
    useHead(head, { script: [map] })
  })

  // Nuxt cross-origin-prefetch: helper function returning script for useHead
  it('works from a helper function without defineScript', () => {
    function generateRules() {
      return {
        type: 'speculationrules' as const,
        key: 'speculationrules',
        innerHTML: {
          prefetch: [
            {
              source: 'list' as const,
              urls: ['https://a.com', 'https://b.com'],
              requires: ['anonymous-client-ip-when-cross-origin'] as const,
            },
          ],
        },
      }
    }
    const head = createHead()
    useHead(head, { script: [generateRules()] })
  })

  // defineScript still works for custom types that need it
  it('accepts as const objects via defineScript', () => {
    const spec = {
      type: 'speculationrules',
      innerHTML: {
        prerender: [{ source: 'list', urls: ['/next-page'] }],
      },
    } as const
    defineScript(spec)
  })
})

describe('useHead — as const link patterns', () => {
  // Nuxt renderer: preload link directly in useHead
  it('accepts preload link directly in useHead', () => {
    const head = createHead()
    useHead(head, {
      link: [
        { rel: 'preload', as: 'fetch', crossorigin: 'anonymous', href: '/payload.json' },
      ],
    })
  })

  // Nuxt renderer: stylesheet with crossorigin directly in useHead
  it('accepts stylesheet with crossorigin directly', () => {
    const head = createHead()
    useHead(head, {
      link: [
        { rel: 'stylesheet', href: '/style.css', crossorigin: '' },
      ],
    })
  })

  // Nuxt renderer: preload as script directly in useHead
  it('accepts preload as script directly', () => {
    const head = createHead()
    useHead(head, {
      link: [
        { rel: 'preload', as: 'script', href: '/chunk.js' },
      ],
    })
  })

  // Nuxt docs: preconnect directly in useHead
  it('accepts preconnect directly', () => {
    const head = createHead()
    useHead(head, {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      ],
    })
  })

  // defineLink only needed for non-standard rels
  it('needs defineLink only for non-standard rels', () => {
    const head = createHead()
    useHead(head, {
      link: [
        defineLink({ rel: 'openid2.provider', href: 'https://example.com/openid' }),
      ],
    })
  })
})
