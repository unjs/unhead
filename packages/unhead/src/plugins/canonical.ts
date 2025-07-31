import type { HeadPluginOptions, Unhead } from '../types'

export interface CanonicalPluginOptions {
  canonicalHost?: string
  customResolver?: (url: string) => string
}

const META_TRANSFORMABLE_URL = [
  'og:url',
  'og:image',
  'og:image:secure_url',
  'twitter:image',
  'twitter:image:src',
  'og:video',
  'og:video:secure_url',
  'og:see_also',
]

/**
 * CanonicalPlugin resolves paths in tags that require a canonical host to be set.
 *
 *  - Resolves paths in meta tags like `og:image` and `twitter:image`.
 *  - Resolves paths in the `og:url` meta tag.
 *  - Resolves paths in the `link` tag with the `rel="canonical"` attribute.
 * @example
 * const plugin = CanonicalPlugin({
 *   canonicalHost: 'https://example.com',
 *   customResolver: (path) => `/custom${path}`,
 * });
 *
 * // This plugin will resolve URLs in meta tags like:
 * // <meta property="og:image" content="/image.jpg">
 * // to:
 * // <meta property="og:image" content="https://example.com/image.jpg">
 */
export function CanonicalPlugin(options: CanonicalPluginOptions): ((head: Unhead) => HeadPluginOptions & { key: string }) {
  return (head) => {
    let host = options.canonicalHost || (!head.ssr ? (window.location.origin) : '')
    // handle https if not provided
    if (!host.startsWith('http') && !host.startsWith('//')) {
      host = `https://${host}`
    }
    // have error thrown if canonicalHost is not a valid URL
    host = new URL(host).origin

    function resolvePath(path: string) {
      if (options?.customResolver) {
        return options.customResolver(path)
      }
      if (path.startsWith('http') || path.startsWith('//'))
        return path

      try {
        return new URL(path, host).toString()
      }
      catch {
        return path
      }
    }
    return {
      key: 'canonical',
      hooks: {
        'tags:resolve': (ctx) => {
          for (const tag of ctx.tags) {
            // allow interchangable use of property and name for DX
            if (tag.tag === 'meta' && (META_TRANSFORMABLE_URL.includes(tag.props?.property) || META_TRANSFORMABLE_URL.includes(tag.props?.name))) {
              tag.props.content = resolvePath(tag.props.content)
            }
            else if (tag.tag === 'link' && tag.props.rel === 'canonical') {
              tag.props.href = resolvePath(tag.props.href)
            }
          }
        },
      },
    }
  }
}
