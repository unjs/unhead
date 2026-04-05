import type { HeadPluginOptions, Unhead } from '../types'

export interface CanonicalPluginOptions {
  canonicalHost?: string
  customResolver?: (url: string) => string
  /**
   * Query parameters to preserve in canonical and og:url tags.
   * All other query parameters will be stripped by default.
   *
   * Set to `false` to disable query filtering (keep all params).
   *
   * @default [] (strips all query params)
   */
  queryWhitelist?: string[] | false
  /**
   * Whether canonical URLs should have a trailing slash.
   *
   * - `true` - always add trailing slash
   * - `false` - always remove trailing slash
   * - `undefined` - leave as-is (default)
   */
  trailingSlash?: boolean
}

const META_TRANSFORMABLE_URL = [
  'og:url',
  'og:image',
  'og:image:url',
  'og:image:secure_url',
  'twitter:image',
  'twitter:image:src',
  'og:video',
  'og:video:url',
  'og:video:secure_url',
  'og:audio',
  'og:audio:url',
  'og:audio:secure_url',
  'twitter:player',
  'twitter:player:stream',
]

/**
 * Link rel values that should have their href resolved to absolute URLs.
 */
const LINK_REL_RESOLVABLE = new Set([
  'canonical',
  'next',
  'prev',
  'alternate',
  'author',
  'license',
  'help',
  'search',
  'pingback',
])

/**
 * Tags that represent page URLs and should have query params filtered,
 * hash fragments stripped, and trailing slash normalized.
 */
const META_CANONICAL_URL = new Set([
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

    const whitelist = options.queryWhitelist !== undefined ? options.queryWhitelist : []

    function normalizeCanonicalUrl(url: string): string {
      try {
        const parsed = new URL(url, host)

        // strip hash fragments - they're client-side only and ignored by search engines
        parsed.hash = ''

        // filter query params
        if (whitelist !== false && parsed.search) {
          const filtered = new URLSearchParams()
          for (const key of whitelist) {
            if (parsed.searchParams.has(key)) {
              for (const value of parsed.searchParams.getAll(key)) {
                filtered.append(key, value)
              }
            }
          }
          parsed.search = filtered.toString()
        }

        // normalize trailing slash
        if (options.trailingSlash === true && !parsed.pathname.endsWith('/')) {
          parsed.pathname = `${parsed.pathname}/`
        }
        else if (options.trailingSlash === false && parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
          parsed.pathname = parsed.pathname.slice(0, -1)
        }

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
              if (META_CANONICAL_URL.has(metaKey)) {
                tag.props.content = normalizeCanonicalUrl(tag.props.content)
              }
            }
            else if (tag.tag === 'link' && LINK_REL_RESOLVABLE.has(tag.props.rel)) {
              const isCanonical = tag.props.rel === 'canonical'
              tag.props.href = resolvePath(tag.props.href)
              if (isCanonical) {
                tag.props.href = normalizeCanonicalUrl(tag.props.href)
              }
            }
          }
        },
      },
    }
  }
}
