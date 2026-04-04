import type { HeadPluginOptions, Unhead } from '../types'

export const DEFAULT_QUERY_WHITELIST = [
  'page',
  'sort',
  'filter',
  'search',
  'q',
  'category',
  'tag',
]

export interface CanonicalPluginOptions {
  canonicalHost?: string
  customResolver?: (url: string) => string
  /**
   * Query parameters to preserve in canonical and og:url tags.
   * All other query parameters will be stripped.
   *
   * Set to `false` to disable query filtering (keep all params).
   *
   * @default ['page', 'sort', 'filter', 'search', 'q', 'category', 'tag']
   */
  queryWhitelist?: string[] | false
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

const META_QUERY_FILTERABLE = new Set([
  'og:url',
])

/**
 * CanonicalPlugin resolves paths in tags that require a canonical host to be set.
 *
 *  - Resolves paths in meta tags like `og:image` and `twitter:image`.
 *  - Resolves paths in the `og:url` meta tag.
 *  - Resolves paths in the `link` tag with the `rel="canonical"` attribute.
 *  - Filters query parameters from canonical and og:url tags.
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

    const whitelist = options.queryWhitelist !== undefined ? options.queryWhitelist : DEFAULT_QUERY_WHITELIST

    function filterQueryParams(url: string): string {
      if (whitelist === false)
        return url

      try {
        const parsed = new URL(url)
        if (!parsed.search)
          return url

        const filtered = new URLSearchParams()
        for (const key of whitelist) {
          if (parsed.searchParams.has(key)) {
            for (const value of parsed.searchParams.getAll(key)) {
              filtered.append(key, value)
            }
          }
        }
        parsed.search = filtered.toString()
        return parsed.toString()
      }
      catch {
        return url
      }
    }

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
            const metaKey = tag.props?.property || tag.props?.name
            // allow interchangable use of property and name for DX
            if (tag.tag === 'meta' && META_TRANSFORMABLE_URL.includes(metaKey)) {
              tag.props.content = resolvePath(tag.props.content)
              if (META_QUERY_FILTERABLE.has(metaKey)) {
                tag.props.content = filterQueryParams(tag.props.content)
              }
            }
            else if (tag.tag === 'link' && tag.props.rel === 'canonical') {
              tag.props.href = filterQueryParams(resolvePath(tag.props.href))
            }
          }
        },
      },
    }
  }
}
