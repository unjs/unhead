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
})
