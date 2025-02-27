import type { Unhead } from 'unhead/types'
import { describe, expect, it } from 'vitest'
import { CanonicalPlugin } from '../../../src/plugins/canonical'

describe('canonicalPlugin', () => {
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
})
