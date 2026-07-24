---
title: "Validate"
description: "Catch common SEO, resource-loading, and head-tag mistakes. Validate URLs, metadata, Open Graph fields, and likely typos."
navigation.title: "Validate"
---

The Validate plugin reports non-absolute URLs, missing Open Graph companions, likely meta-property typos, conflicting robots directives, and other head mistakes. It runs only when registered.

## Runtime validation

The Validate plugin inspects the final resolved head output and warns about issues that TypeScript can't catch:

- **URL problems**: Relative canonical or Open Graph URLs, and canonical versus `og:url` mismatches
- **Missing tags**: No title, no description on an indexable page, or missing Open Graph companions
- **Content issues**: Empty meta content, HTML in a title, or unresolved template params
- **Conflicts**: Contradictory robots directives or accessibility-harmful viewport settings
- **Typos**: Unknown meta properties or names, with fuzzy-matched suggestions

## Setup

Register the plugin where you want head tag validation. It is omitted from builds that do not import it:

::code-block

```ts [Input]
import { ValidatePlugin } from '@unhead/dynamic-import/plugins'

const head = createHead({
  plugins: [
    ValidatePlugin()
  ]
})
```

::

By default, warnings are logged via `console.warn`. You can provide a custom reporter:

::code-block

```ts [Input]
ValidatePlugin({
  onReport(rules) {
    // rules: Array<{ id, message, severity, source?, tag? }>
    for (const rule of rules) {
      const loc = rule.source ? ` (${rule.source})` : ''
      console.warn(`[${rule.id}] ${rule.message}${loc}`)
    }
  }
})
```

::

## Options

::code-block

```ts [Input]
export interface ValidatePluginOptions {
  /**
   * Callback to handle validation results. Receives all rules found per resolve cycle.
   * Defaults to `console.warn` for each rule.
   */
  onReport?: (rules: HeadValidationRule[]) => void
  /** Configure severity and per-rule options. */
  rules?: RulesConfig
  /**
   * Project root path. When set, source locations are displayed as relative paths (e.g., ./src/components/MyPage.vue:42:5).
   */
  root?: string
}
```

::

## Rules

### URL Validity

Google recommends [absolute canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls#rel-canonical-link-method), and the [Open Graph URL type](https://ogp.me/#types) is limited to `http://` and `https://` resources.

| Rule ID | What it catches |
| --------- | ---------------- |
| `non-absolute-canonical` | Canonical URL is not absolute (`/page` instead of `https://example.com/page`) |
| `non-absolute-og-url` | `og:image`, `og:url`, `og:video`, `og:audio`, `twitter:image`, etc. are not absolute URLs |
| `canonical-og-url-mismatch` | `<link rel="canonical">` href differs from `og:url` content |

### Content Quality

| Rule ID | What it catches |
| --------- | ---------------- |
| `missing-title` | Page has no `<title>` tag |
| `missing-description` | Page has no `<meta name="description">` and is indexable (no `noindex`) |
| `empty-title` | Title tag exists but is empty or whitespace-only |
| `empty-meta-content` | Meta tag has `name`/`property` but empty `content` |
| `html-in-title` | Title contains `<` or `>` characters (will be escaped, not rendered as HTML) |
| `unresolved-template-param` | Literal `%paramName%` found in rendered output; template params may be misconfigured |

### Migration and Configuration

| Rule ID | What it catches |
| --------- | ---------------- |
| `deprecated-option-mode` | Removed v2 `mode` entry option |
| `deprecated-prop-body` | Removed `body: true` tag property |
| `deprecated-prop-children` | Removed `children` content property |
| `deprecated-prop-hid-vmid` | Removed `hid` or `vmid` keys |
| `missing-alias-sorting-plugin` | A `before:` or `after:` priority is used without `AliasSortingPlugin` |
| `missing-template-params-plugin` | `templateParams` is used without `TemplateParamsPlugin` |
| `nested-head-properties` | Top-level head properties such as `meta` or `titleTemplate` are nested inside `htmlAttrs` or `bodyAttrs` |
| `numeric-tag-priority` | A numeric `tagPriority` is used instead of a named priority |

### Missing Companion Tags

The [Open Graph protocol](https://ogp.me/) defines the basic object fields and optional structured properties for `og:image`. `og:description` and image dimensions are optional in the protocol; the plugin recommends them for more complete link previews but does not treat them as conformance errors.

| Rule ID | What it catches |
| --------- | ---------------- |
| `og-image-missing-dimensions` | `og:image` is set without its optional `og:image:width` and/or `og:image:height` structured properties |
| `og-missing-title` | Open Graph tags are present but `og:title` is missing |
| `og-missing-description` | Open Graph tags are present but `og:description` is missing |
| `preload-font-crossorigin` | `<link rel="preload" as="font">` is missing `crossorigin`, so its CORS mode may not match the eventual font request |
| `preload-missing-as` | `<link rel="preload">` is missing the required `as` attribute |
| `script-src-with-content` | `<script src="...">` also has inline content; the browser will ignore the inline content |

### Conflict Detection

| Rule ID                       | Severity | What it catches                                                                           |
| ----------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| `robots-conflict`             | `warn`   | Robots meta has contradictory directives (`index, noindex` or `follow, nofollow`)         |
| `viewport-user-scalable`      | `info`   | Viewport has `user-scalable=no` or `maximum-scale=1`, which harms accessibility           |
| `twitter-handle-missing-at`   | `warn`   | `twitter:site` or `twitter:creator` value does not start with `@`                         |

### Typo Detection

| Rule ID         | What it catches                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------- |
| `possible-typo` | Unknown meta `property` or `name` close to a known value; suggests `og:title` for `og:titl`         |

Typo detection only runs for recognized prefixes (`og:`, `article:`, `book:`, `profile:`, `fb:`, `twitter:`, or standard meta names without a colon). Custom prefixes like `custom:foo` are ignored.

### Performance Hints

These rules encode conservative heuristics rather than universal browser limits. Their underlying browser behavior is documented in the primary references for [script loading](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script#notes), [preload and CORS request matching](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload#cors-enabled_fetches), [resource hints](https://web.dev/learn/performance/resource-hints), [early charset declarations](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta#charset), and [viewport accessibility](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport#usage_notes).

| Rule ID | Severity | What it catches |
| --------- | ---------- | ---------------- |
| `render-blocking-script` | `warn` | `<script src>` in head without `async`, `defer`, or `type="module"` pauses the HTML parser |
| `too-many-fetchpriority-high` | `warn` | More than two resources have `fetchpriority="high"`, which can dilute the priority signal |
| `defer-on-module-script` | `info` | `defer` on a `type="module"` script is redundant. Modules are deferred by default |
| `duplicate-resource-hint` | `warn` | Same `rel`/`href` pair appears multiple times in preload, prefetch, or preconnect tags |
| `charset-not-early` | `warn` | During SSR, `<meta charset>` appears after the configured number of rendered head tags (three by default). This is a tag-position heuristic; it does not measure the declaration's byte offset |
| `preload-not-modulepreload` | `warn` | `<link rel="preload" as="script">` for a module script should use `rel="modulepreload"` to also trigger module parsing |
| `preconnect-missing-crossorigin` | `warn` | `<link rel="preconnect">` is missing `crossorigin` but CORS resources are loaded from that origin, causing a separate connection |
| `preload-fetchpriority-conflict` | `warn` | A non-script preload has `fetchpriority="low"`; script preloads are exempt because `useScript()` uses that combination for warmup |
| `too-many-preloads` | `warn` | More than 6 `<link rel="preload">` tags compete for bandwidth and hurt performance |
| `too-many-prefetches` | `info` | More than 50 `<link rel="prefetch">` tags may consume speculative bandwidth and cache capacity. This advisory guardrail is not a browser or standards limit |
| `too-many-preconnects` | `warn` | More than 4 `<link rel="preconnect">` tags; each starts connection work that can compete with critical resources |
| `redundant-dns-prefetch` | `info` | Same origin has both `<link rel="preconnect">` and `<link rel="dns-prefetch">`; preconnect already includes DNS resolution |
| `preload-async-defer-conflict` | `warn` | A preloaded script also has `async` or `defer` and the preload is not marked `fetchpriority="low"`. Browsers allow this combination; the warning is the plugin's priority heuristic |
| `prefetch-preload-conflict` | `warn` | Same resource has both `preload` and `prefetch`; use preload for current page, prefetch for future navigation |
| `inline-style-size` | `info` | Inline `<style>` exceeds the plugin's default 14KB threshold |
| `inline-script-size` | `info` | Inline `<script>` exceeds 2KB; consider moving to an external file for cacheability |
| `meta-beyond-1mb` | `warn` | The plugin's serialized-size estimate places a `<meta>` tag beyond its default 1MB inspection threshold |

## Rule configuration

Rules can be disabled or have their severity overridden, similar to ESLint's flat config:

::code-block

```ts [Input]
ValidatePlugin({
  rules: {
    'missing-description': 'off',
    'viewport-user-scalable': 'off',
    'missing-title': 'info', // downgrade from warn to info
  }
})
```

::

Some rules accept an options object as an ESLint-style `[severity, options]` tuple:

::code-block

```ts [Input]
ValidatePlugin({
  rules: {
    'too-many-preloads': ['warn', { max: 10 }],
    'too-many-prefetches': ['info', { max: 100 }],
    'too-many-preconnects': ['warn', { max: 6 }],
    'too-many-fetchpriority-high': ['warn', { max: 3 }],
    'charset-not-early': ['warn', { maxPosition: 5 }],
    'inline-style-size': ['info', { maxKB: 20 }],
    'inline-script-size': ['info', { maxKB: 5 }],
    'meta-beyond-1mb': ['warn', { maxBytes: 512_000 }], // 500KB instead of default 1MB
  }
})
```

::

Only rules that support options accept the tuple form, and each rule's options are typed.

## Source tracing

Rules associated with a specific tag can include a `source` field pointing to the `head.push()` call that introduced it. Cross-tag rules such as a missing title may not have a source. By default, captured sources use absolute paths. Set `root` to make them relative:

::code-block

```ts [Input]
ValidatePlugin({
  root: process.cwd(),
})
// output: [unhead] Canonical URL should be absolute, received "/page". (./src/components/MyPage.vue:42:5)
```

::

## Framework DevTools integration

The `onReport` callback receives structured rule objects that you can pass to a UI:

::code-block

```ts [Input]
ValidatePlugin({
  onReport(rules) {
    // Example: Nuxt DevTools integration
    for (const rule of rules) {
      devtools.addWarning({
        id: rule.id,
        message: rule.message,
        severity: rule.severity,
        // rule.tag contains the full HeadTag object for inspection
      })
    }
  }
})
```

::

## Related

- [Canonical Plugin](/docs/head/guides/plugins/canonical): Auto-resolve relative URLs to absolute
- [Infer SEO Meta](/docs/head/guides/plugins/infer-seo-meta-tags): Auto-generate OG and Twitter meta tags
- [useSeoMeta()](/docs/head/api/composables/use-seo-meta): Type-safe SEO meta management
