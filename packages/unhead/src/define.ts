import type { InferLink, InferScript, Link, Script } from './types'

/**
 * Typed helper for declaring a `<link>` element inside {@link useHead}.
 *
 * Known `rel` values stay strict: `rel: 'preload'` still requires `as`,
 * preload fonts still require `crossorigin`, `rel: 'mask-icon'` still requires
 * `color`, etc. Non-standard `rel` values not covered by `KnownLinkRel` (e.g.
 * OpenID endpoints, custom protocol discovery links) are accepted via
 * `GenericLink` without losing strictness on the rest of the union.
 *
 * Standard rels like `'me'`, `'webmention'`, `'privacy-policy'`, and
 * `'terms-of-service'` are already in the `Link` union, so they work with
 * `useHead` directly without this helper.
 *
 * @example
 * ```ts
 * import { defineLink, useHead } from 'unhead'
 *
 * useHead({
 *   link: [
 *     defineLink({ rel: 'openid2.provider', href: 'https://example.com/openid' }),
 *     defineLink({ rel: 'EditURI', href: '/rsd.xml', type: 'application/rsd+xml' }),
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
