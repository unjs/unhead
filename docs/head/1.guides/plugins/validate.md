---
title: "Validate"
description: "Catch common SEO, performance, and head tag mistakes. Validates URLs, meta tags, Open Graph, Twitter Cards, web vitals anti-patterns, and detects typos with fuzzy matching."
navigation.title: "Validate"
---

**Quick Answer:** The Validate plugin catches common head tag mistakes — non-absolute URLs, missing OG tags, typos in meta properties, conflicting robots directives, and more. It runs only when you register it and is fully tree-shakeable.

## What Does This Plugin Do?

The Validate plugin inspects the final resolved head output and warns about issues that TypeScript can't catch:

- **URL problems** — relative canonical/OG URLs, canonical vs og:url mismatches
- **Missing tags** — no title, no description (when indexable), missing OG companions
- **Content issues** — empty meta content, HTML in title, unresolved template params
- **Conflicts** — contradictory robots directives, accessibility-harmful viewport settings
- **Typos** — fuzzy-matches unknown meta properties/names against known values with "Did you mean?" suggestions

## How Do I Set Up the Plugin?

Register the plugin when you want head tag validation — it's fully tree-shakeable when not imported:

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

## What Options Can I Configure?

::code-block

```ts [Input]
export interface ValidatePluginOptions {
  /**
   * Callback to handle validation results. Receives all rules found per resolve cycle.
   * Defaults to `console.warn` for each rule.
   */
  onReport?: (rules: HeadValidationRule[]) => void
  /**
   * Configure rule severity. Set to 'off' to disable, or 'warn'/'info' to override.
   */
  rules?: Partial<Record<string, 'warn' | 'info' | 'off'>>
  /**
   * Project root path. When set, source locations are displayed as relative paths (e.g. ./src/components/MyPage.vue:42:5).
   */
  root?: string
}
```

::

## What Rules Are Included?

### URL Validity

| Rule ID | What it catches |
|---------|----------------|
| `non-absolute-canonical` | Canonical URL is not absolute (`/page` instead of `https://example.com/page`) |
| `non-absolute-og-url` | `og:image`, `og:url`, `og:video`, `og:audio`, `twitter:image`, etc. are not absolute URLs |
| `canonical-og-url-mismatch` | `<link rel="canonical">` href differs from `og:url` content |

### Content Quality

| Rule ID | What it catches |
|---------|----------------|
| `missing-title` | Page has no `<title>` tag |
| `missing-description` | Page has no `<meta name="description">` and is indexable (no `noindex`) |
| `empty-title` | Title tag exists but is empty or whitespace-only |
| `empty-meta-content` | Meta tag has `name`/`property` but empty `content` |
| `html-in-title` | Title contains `<` or `>` characters (will be escaped, not rendered as HTML) |
| `unresolved-template-param` | Literal `%paramName%` found in rendered output — template params may be misconfigured |

### Missing Companion Tags

| Rule ID | What it catches |
|---------|----------------|
| `og-image-missing-dimensions` | `og:image` is set but `og:image:width` and/or `og:image:height` are missing — social platforms may not display the image |
| `og-missing-title` | Open Graph tags are present but `og:title` is missing |
| `og-missing-description` | Open Graph tags are present but `og:description` is missing |
| `preload-font-crossorigin` | `<link rel="preload" as="font">` is missing `crossorigin` — the font will be fetched twice |
| `preload-missing-as` | `<link rel="preload">` is missing the required `as` attribute |
| `script-src-with-content` | `<script src="...">` also has inline content — the browser will ignore the inline content |

### Conflict Detection

| Rule ID | Severity | What it catches |
|---------|----------|----------------|
| `robots-conflict` | `warn` | Robots meta has contradictory directives (e.g., `index, noindex` or `follow, nofollow`) |
| `viewport-user-scalable` | `info` | Viewport has `user-scalable=no` or `maximum-scale=1` which harms accessibility |
| `twitter-handle-missing-at` | `warn` | `twitter:site` or `twitter:creator` value doesn't start with `@` |

### Typo Detection

| Rule ID | What it catches |
|---------|----------------|
| `possible-typo` | Unknown meta `property` or `name` that is close to a known value. Uses fuzzy matching to suggest corrections: `og:titl` → "Did you mean `og:title`?" |

Typo detection only runs for recognized prefixes (`og:`, `article:`, `book:`, `profile:`, `fb:`, `twitter:`, or standard meta names without a colon). Custom prefixes like `custom:foo` are ignored.

### Performance Hints

Rules inspired by [webperf-snippets](https://webperf-snippets.nucliweb.net/) that catch common performance anti-patterns in head tags:

| Rule ID | Severity | What it catches |
|---------|----------|----------------|
| `render-blocking-script` | `warn` | `<script src>` in head without `async`, `defer`, or `type="module"` blocks the critical rendering path |
| `too-many-fetchpriority-high` | `warn` | More than 2 resources with `fetchpriority="high"`. When everything is high priority, nothing is |
| `defer-on-module-script` | `info` | `defer` on a `type="module"` script is redundant. Modules are deferred by default |
| `duplicate-resource-hint` | `warn` | Same `rel`/`href` pair appears multiple times in preload, prefetch, or preconnect tags |
| `charset-not-early` | `warn` | `<meta charset>` is not within the first few tags in `<head>`, which can force the browser to re-parse |
| `preload-not-modulepreload` | `warn` | `<link rel="preload" as="script">` for a module script should use `rel="modulepreload"` to also trigger module parsing |
| `preconnect-missing-crossorigin` | `warn` | `<link rel="preconnect">` is missing `crossorigin` but CORS resources are loaded from that origin, causing a separate connection |
| `preload-fetchpriority-conflict` | `warn` | `<link rel="preload" fetchpriority="low">` is contradictory — preload signals critical, low priority contradicts that |
| `too-many-preloads` | `warn` | More than 6 `<link rel="preload">` tags compete for bandwidth and hurt performance |
| `too-many-preconnects` | `warn` | More than 4 `<link rel="preconnect">` tags — each initiates a TCP+TLS handshake, competing for limited connections |
| `redundant-dns-prefetch` | `info` | Same origin has both `<link rel="preconnect">` and `<link rel="dns-prefetch">` — preconnect already includes DNS resolution |
| `preload-async-defer-conflict` | `warn` | A script is preloaded but also has `async` or `defer` — preload escalates the priority, defeating the purpose |
| `prefetch-preload-conflict` | `warn` | Same resource has both `preload` and `prefetch` — use preload for current page, prefetch for future navigation |
| `inline-style-size` | `info` | Inline `<style>` exceeds 14KB (the critical CSS budget for the first TCP round-trip) |
| `inline-script-size` | `info` | Inline `<script>` exceeds 2KB — consider moving to an external file for cacheability |
| `meta-beyond-1mb` | `warn` | A `<meta>` tag is rendered beyond the 1MB crawler parsing limit — social crawlers (Facebook, Twitter) may not see it |

## How Do I Configure Rules?

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

The configuration is fully type-safe — only rules that support options accept the tuple form, and options are typed per-rule.

## How Does Source Tracing Work?

Each validation rule includes a `source` field pointing to the `head.push()` call that introduced the problematic tag. By default this is an absolute path. Set `root` to get clickable relative paths in your terminal or IDE:

::code-block

```ts [Input]
ValidatePlugin({
  root: process.cwd(),
})
// output: [unhead] Canonical URL should be absolute, received "/page". (./src/components/MyPage.vue:42:5)
```

::

## How Do I Integrate with Framework DevTools?

The `onReport` callback receives structured rule objects, making it easy to integrate with any UI:

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

- [Canonical Plugin](/docs/head/guides/plugins/canonical) - Auto-resolve relative URLs to absolute
- [Infer SEO Meta](/docs/head/guides/plugins/infer-seo-meta-tags) - Auto-generate OG and Twitter meta tags
- [useSeoMeta()](/docs/head/api/composables/use-seo-meta) - Type-safe SEO meta management
