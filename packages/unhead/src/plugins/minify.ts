import type { HeadPluginInput } from '../types/head'
import { minifyCSS } from '../minify/css'
import { minifyJS } from '../minify/js'
import { minifyJSON } from '../minify/json'

export interface MinifyPluginOptions {
  /**
   * Custom JS minifier. Set to `false` to disable JS minification.
   * Defaults to built-in lightweight minifier.
   */
  js?: false | ((code: string) => string)
  /**
   * Custom CSS minifier. Set to `false` to disable CSS minification.
   * Defaults to built-in lightweight minifier.
   */
  css?: false | ((code: string) => string)
  /**
   * Minify JSON script types (application/ld+json, application/json).
   * @default true
   */
  json?: boolean
}

const JSON_TYPES = new Set(['application/json', 'application/ld+json'])
const SKIP_JS_TYPES = new Set(['application/json', 'application/ld+json', 'speculationrules', 'importmap'])

/**
 * Minifies inline script and style tag content during SSR rendering.
 *
 * Uses lightweight pure-JS minifiers by default (zero native dependencies, safe for edge/serverless).
 * Custom minifiers can be provided for heavier optimization.
 *
 * Note: The `ssr:render` hook runs synchronously in the render pipeline, so custom minifiers must be synchronous.
 *
 * @example
 * ```ts
 * import { MinifyPlugin } from 'unhead/plugins'
 *
 * const head = createHead({
 *   plugins: [MinifyPlugin()]
 * })
 * ```
 */
export function MinifyPlugin(options?: MinifyPluginOptions): HeadPluginInput {
  const jsMinify = options?.js === false ? false : (options?.js || minifyJS)
  const cssMinify = options?.css === false ? false : (options?.css || minifyCSS)
  const jsonMinify = options?.json !== false
  return {
    key: 'minify',
    hooks: {
      'ssr:render': ({ tags }) => {
        for (const tag of tags) {
          const content = tag.innerHTML
          if (!content || content.length < 20)
            continue

          if (tag.tag === 'script') {
            const type = tag.props?.type
            if (type && JSON_TYPES.has(type)) {
              if (jsonMinify) {
                const min = minifyJSON(content)
                if (min.length < content.length)
                  tag.innerHTML = min
              }
              continue
            }
            if (type && SKIP_JS_TYPES.has(type))
              continue
            if (jsMinify) {
              const min = jsMinify(content)
              if (min.length < content.length)
                tag.innerHTML = min
            }
          }
          else if (tag.tag === 'style' && cssMinify) {
            const min = cssMinify(content)
            if (min.length < content.length)
              tag.innerHTML = min
          }
        }
      },
    },
  }
}
