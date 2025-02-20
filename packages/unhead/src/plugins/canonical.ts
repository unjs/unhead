import { defineHeadPlugin } from './defineHeadPlugin'

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
export function CanonicalPlugin(options: { canonicalHost?: string, customResolver?: (url: string) => string }) {
  return defineHeadPlugin((head) => {
    function resolvePath(path: string) {
      if (options?.customResolver) {
        return options.customResolver(path)
      }
      let host = options.canonicalHost || (!head.ssr ? (window.location.origin) : '')
      // handle https if not provided
      if (!host.startsWith('http') && !host.startsWith('//')) {
        host = `https://${host}`
      }
      // have error thrown if canonicalHost is not a valid URL
      host = new URL(host).origin
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
            if (tag.tag === 'meta') {
              if (tag.props.property?.startsWith('og:image') || tag.props.name?.startsWith('twitter:image')) {
                tag.props.content = resolvePath(tag.props.content)
              }
              else if (tag.props?.property === 'og:url') {
                tag.props.content = resolvePath(tag.props.content)
              }
            }
            else if (tag.tag === 'link' && tag.props.rel === 'canonical') {
              tag.props.href = resolvePath(tag.props.href)
            }
          }
        },
      },
    }
  })
}
