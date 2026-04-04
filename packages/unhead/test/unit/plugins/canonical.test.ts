import type { Unhead } from 'unhead/types'
import { describe, expect, it } from 'vitest'
import { CanonicalPlugin, DEFAULT_QUERY_WHITELIST } from '../../../src/plugins/canonical'

describe('canonicalPlugin', () => {
  it('doesnt modify non url props', () => {
    const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
    const ctx = {
      tags: [
        { tag: 'meta', props: { property: 'og:image', content: '/image.jpg' } },
        { tag: 'meta', props: { property: 'og:image:width', content: '1200' } },
        { tag: 'meta', props: { property: 'og:image:height', content: '630' } },
        { tag: 'meta', props: { property: 'og:image:alt', content: 'An image' } },
      ],
    }

    // @ts-expect-error untyped
    plugin.hooks['tags:resolve'](ctx)

    expect(ctx.tags[0].props.content).toBe('https://example.com/image.jpg')
    expect(ctx.tags[1].props.content).toBe('1200')
    expect(ctx.tags[2].props.content).toBe('630')
    expect(ctx.tags[3].props.content).toBe('An image')
  })

  it('should resolve og:image URLs correctly', () => {
    const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
    const ctx = {
      tags: [
        { tag: 'meta', props: { property: 'og:image', content: '/image.jpg' } },
      ],
    }

    // @ts-expect-error untyped
    plugin.hooks['tags:resolve'](ctx)

    expect(ctx.tags[0].props.content).toBe('https://example.com/image.jpg')
  })

  it('should resolve twitter:image URLs correctly', () => {
    const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
    const ctx = {
      tags: [
        { tag: 'meta', props: { name: 'twitter:image', content: '/image.jpg' } },
      ],
    }

    // @ts-expect-error untyped
    plugin.hooks['tags:resolve'](ctx)

    expect(ctx.tags[0].props.content).toBe('https://example.com/image.jpg')
  })

  it('should resolve og:url URLs correctly', () => {
    const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
    const ctx = {
      tags: [
        { tag: 'meta', props: { property: 'og:url', content: '/page' } },
      ],
    }

    // @ts-expect-error untyped
    plugin.hooks['tags:resolve'](ctx)

    expect(ctx.tags[0].props.content).toBe('https://example.com/page')
  })

  it('should resolve canonical link URLs correctly', () => {
    const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
    const ctx = {
      tags: [
        { tag: 'link', props: { rel: 'canonical', href: '/page' } },
      ],
    }

    // @ts-expect-error untyped
    plugin.hooks['tags:resolve'](ctx)

    expect(ctx.tags[0].props.href).toBe('https://example.com/page')
  })

  it('should use custom resolver if provided', () => {
    const plugin = CanonicalPlugin({
      canonicalHost: 'https://example.com',
      customResolver: path => `/custom${path}`,
    })({ ssr: false } as Unhead)
    const ctx = {
      tags: [
        { tag: 'meta', props: { property: 'og:image', content: '/image.jpg' } },
      ],
    }

    // @ts-expect-error untyped
    plugin.hooks['tags:resolve'](ctx)

    expect(ctx.tags[0].props.content).toBe('/custom/image.jpg')
  })

  it('should handle already fully qualified URLs', () => {
    const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
    const ctx = {
      tags: [
        { tag: 'meta', props: { property: 'og:image', content: 'https://other.com/image.jpg' } },
      ],
    }

    // @ts-expect-error untyped
    plugin.hooks['tags:resolve'](ctx)

    expect(ctx.tags[0].props.content).toBe('https://other.com/image.jpg')
  })

  it('should handle canonicalHost without protocol', () => {
    const plugin = CanonicalPlugin({ canonicalHost: 'example.com' })
    const { hooks } = plugin({ ssr: false } as Unhead)
    const ctx = {
      tags: [
        { tag: 'meta', props: { property: 'og:image', content: '/image.jpg' } },
      ],
    }
    // @ts-expect-error untyped
    hooks['tags:resolve'](ctx)

    expect(ctx.tags[0].props.content).toBe('https://example.com/image.jpg')
  })

  describe('query parameter filtering', () => {
    it('should strip non-whitelisted query params from canonical URLs', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'link', props: { rel: 'canonical', href: '/page?utm_source=twitter&page=2&fbclid=abc' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.href).toBe('https://example.com/page?page=2')
    })

    it('should strip non-whitelisted query params from og:url', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'meta', props: { property: 'og:url', content: '/page?utm_source=twitter&q=hello' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.content).toBe('https://example.com/page?q=hello')
    })

    it('should NOT filter query params from og:image', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'meta', props: { property: 'og:image', content: '/image.jpg?width=1200&format=webp' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.content).toBe('https://example.com/image.jpg?width=1200&format=webp')
    })

    it('should NOT filter query params from twitter:image', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'meta', props: { name: 'twitter:image', content: '/image.jpg?token=abc' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.content).toBe('https://example.com/image.jpg?token=abc')
    })

    it('should strip all query params when whitelist is empty', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com', queryWhitelist: [] })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'link', props: { rel: 'canonical', href: '/page?page=2&sort=date' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.href).toBe('https://example.com/page')
    })

    it('should keep all query params when whitelist is false', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com', queryWhitelist: false })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'link', props: { rel: 'canonical', href: '/page?utm_source=twitter&fbclid=abc' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.href).toBe('https://example.com/page?utm_source=twitter&fbclid=abc')
    })

    it('should support custom whitelist', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com', queryWhitelist: ['ref', 'v'] })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'link', props: { rel: 'canonical', href: '/page?ref=docs&v=2&utm_source=twitter' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.href).toBe('https://example.com/page?ref=docs&v=2')
    })

    it('should preserve all default whitelisted params', () => {
      const params = DEFAULT_QUERY_WHITELIST.map(k => `${k}=val`).join('&')
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'link', props: { rel: 'canonical', href: `/page?${params}&utm_source=twitter` } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      for (const key of DEFAULT_QUERY_WHITELIST) {
        expect(ctx.tags[0].props.href).toContain(`${key}=val`)
      }
      expect(ctx.tags[0].props.href).not.toContain('utm_source')
    })

    it('should handle URLs without query params', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'link', props: { rel: 'canonical', href: '/page' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.href).toBe('https://example.com/page')
    })

    it('should handle fully qualified canonical URLs with query params', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'link', props: { rel: 'canonical', href: 'https://example.com/page?utm_source=google&page=3' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.href).toBe('https://example.com/page?page=3')
    })
  })

  describe('hash stripping', () => {
    it('should strip hash fragments from canonical URLs', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'link', props: { rel: 'canonical', href: '/page#section' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.href).toBe('https://example.com/page')
    })

    it('should strip hash fragments from og:url', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'meta', props: { property: 'og:url', content: '/page#section' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.content).toBe('https://example.com/page')
    })

    it('should NOT strip hash fragments from og:image', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'meta', props: { property: 'og:image', content: '/image.jpg#ref' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.content).toBe('https://example.com/image.jpg#ref')
    })
  })

  describe('trailing slash normalization', () => {
    it('should add trailing slash when trailingSlash is true', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com', trailingSlash: true })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'link', props: { rel: 'canonical', href: '/page' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.href).toBe('https://example.com/page/')
    })

    it('should not double trailing slash', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com', trailingSlash: true })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'link', props: { rel: 'canonical', href: '/page/' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.href).toBe('https://example.com/page/')
    })

    it('should remove trailing slash when trailingSlash is false', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com', trailingSlash: false })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'link', props: { rel: 'canonical', href: '/page/' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.href).toBe('https://example.com/page')
    })

    it('should not remove trailing slash from root path', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com', trailingSlash: false })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'link', props: { rel: 'canonical', href: '/' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.href).toBe('https://example.com/')
    })

    it('should leave trailing slash as-is when not configured', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'link', props: { rel: 'canonical', href: '/page/' } },
          { tag: 'meta', props: { property: 'og:url', content: '/other' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.href).toBe('https://example.com/page/')
      expect(ctx.tags[1].props.content).toBe('https://example.com/other')
    })

    it('should apply trailing slash to og:url', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com', trailingSlash: true })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'meta', props: { property: 'og:url', content: '/page' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.content).toBe('https://example.com/page/')
    })
  })

  describe('rel next/prev resolution', () => {
    it('should resolve rel="next" to absolute URL', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'link', props: { rel: 'next', href: '/page/2' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.href).toBe('https://example.com/page/2')
    })

    it('should resolve rel="prev" to absolute URL', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'link', props: { rel: 'prev', href: '/page/1' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.href).toBe('https://example.com/page/1')
    })

    it('should NOT apply query filtering to rel="next"', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'link', props: { rel: 'next', href: '/page?cursor=abc123&page=2' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.href).toBe('https://example.com/page?cursor=abc123&page=2')
    })

    it('should NOT apply query filtering to rel="prev"', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'link', props: { rel: 'prev', href: '/page?cursor=xyz&page=1' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.href).toBe('https://example.com/page?cursor=xyz&page=1')
    })
  })

  describe('og:audio resolution', () => {
    it('should resolve og:audio to absolute URL', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'meta', props: { property: 'og:audio', content: '/audio/track.mp3' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.content).toBe('https://example.com/audio/track.mp3')
    })

    it('should resolve og:audio:secure_url to absolute URL', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'meta', props: { property: 'og:audio:secure_url', content: '/audio/track.mp3' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.content).toBe('https://example.com/audio/track.mp3')
    })
  })

  describe('customResolver with normalization', () => {
    it('should apply normalization after customResolver on canonical', () => {
      const plugin = CanonicalPlugin({
        canonicalHost: 'https://example.com',
        customResolver: path => `https://example.com/prefix${path}`,
      })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'link', props: { rel: 'canonical', href: '/page?utm_source=twitter&page=2#section' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.href).toBe('https://example.com/prefix/page?page=2')
    })

    it('should apply normalization after customResolver on og:url', () => {
      const plugin = CanonicalPlugin({
        canonicalHost: 'https://example.com',
        customResolver: path => `https://example.com${path}`,
      })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'meta', props: { property: 'og:url', content: '/page?fbclid=abc#top' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.content).toBe('https://example.com/page')
    })
  })

  describe('link rel resolution', () => {
    it.each([
      ['alternate', '/en/page'],
      ['author', '/about/author'],
      ['license', '/license'],
      ['help', '/help'],
      ['search', '/opensearch.xml'],
      ['pingback', '/xmlrpc.php'],
    ])('should resolve rel="%s" to absolute URL', (rel, href) => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'link', props: { rel, href } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.href).toBe(`https://example.com${href}`)
    })

    it('should resolve alternate hreflang links', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'link', props: { rel: 'alternate', hreflang: 'es', href: '/es/page' } },
          { tag: 'link', props: { rel: 'alternate', hreflang: 'fr', href: '/fr/page' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.href).toBe('https://example.com/es/page')
      expect(ctx.tags[1].props.href).toBe('https://example.com/fr/page')
    })

    it('should NOT apply canonical normalization to non-canonical link rels', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'link', props: { rel: 'alternate', href: '/page?ref=rss#latest' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.href).toBe('https://example.com/page?ref=rss#latest')
    })

    it('should NOT resolve non-resolvable link rels', () => {
      const plugin = CanonicalPlugin({ canonicalHost: 'https://example.com' })({ ssr: false } as Unhead)
      const ctx = {
        tags: [
          { tag: 'link', props: { rel: 'stylesheet', href: '/styles.css' } },
          { tag: 'link', props: { rel: 'icon', href: '/favicon.ico' } },
        ],
      }

      // @ts-expect-error untyped
      plugin.hooks['tags:resolve'](ctx)

      expect(ctx.tags[0].props.href).toBe('/styles.css')
      expect(ctx.tags[1].props.href).toBe('/favicon.ico')
    })
  })
})
