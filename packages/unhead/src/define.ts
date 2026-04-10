import type { InferLink, InferScript, Link, Script } from './types'

/**
 * Typed helper for declaring a `<link>` element inside {@link useHead}.
 *
 * Known `rel` values stay strict: `rel: 'preload'` still requires `as`,
 * preload fonts still require `crossorigin`, `rel: 'mask-icon'` still requires
 * `color`, etc. Custom or non-standard `rel` values (e.g. `'me'`, `'webmention'`,
 * `'hub'`) are accepted via {@link GenericLink} without losing strictness on
 * the rest of the union.
 *
 * @example
 * ```ts
 * import { defineLink, useHead } from 'unhead'
 *
 * useHead({
 *   link: [
 *     defineLink({ rel: 'me', href: 'https://mastodon.social/@me' }),
 *     defineLink({ rel: 'webmention', href: '/webmention' }),
 *   ],
 * })
 * ```
 */
export function defineLink<const T extends { rel: string }>(link: T & InferLink<T>): Link {
  return link as unknown as Link
}

/**
 * Typed helper for declaring a `<script>` element inside {@link useHead}.
 *
 * Known `type` values stay strict: `type: 'module'` still requires `src` or inline
 * content, `type: 'application/ld+json'` still requires `textContent`, etc. Custom
 * or non-standard `type` values (e.g. `'text/plain'`, `'text/html'`) are accepted
 * via {@link GenericScript} without losing strictness on the rest of the union.
 *
 * @example
 * ```ts
 * import { defineScript, useHead } from 'unhead'
 *
 * useHead({
 *   script: [
 *     defineScript({ type: 'text/plain', textContent: 'debug-token' }),
 *   ],
 * })
 * ```
 */
export function defineScript<const T extends object>(script: T & InferScript<T>): Script {
  return script as unknown as Script
}
