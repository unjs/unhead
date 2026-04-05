---
title: "Canonical Plugin"
description: "Auto-generate canonical URLs and convert relative paths to absolute. Required for og:image, twitter:image, and SEO canonical links."
navigation.title: "Canonical Plugin"
---

**Quick Answer:** The Canonical plugin automatically generates `<link rel="canonical">` tags and converts relative URLs to absolute URLs in your meta tags. Enable it with `CanonicalPlugin({ canonicalHost: 'https://mysite.com' })` in your head configuration.

## Why Do I Need Absolute URLs in Meta Tags?

The Canonical Plugin automatically converts relative URLs to absolute URLs in your meta tags, which is essential for:

- [Google SEO](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): Requires absolute URLs for canonical links
- [Facebook](https://developers.facebook.com/docs/sharing/webmasters/getting-started): Ignores relative image paths in Open Graph tags
- [Twitter](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/markup): Requires absolute URLs for Twitter Card images

## What Tags Does the Plugin Transform?

The plugin resolves relative URLs to absolute URLs in all of these tags:

### Meta Tags

- `og:url`, `og:image`, `og:image:url`, `og:image:secure_url`
- `og:video`, `og:video:url`, `og:video:secure_url`
- `og:audio`, `og:audio:url`, `og:audio:secure_url`
- `twitter:image`, `twitter:image:src`
- `twitter:player`, `twitter:player:stream`

### Link Tags

- `rel="canonical"` — with query filtering, hash stripping, and trailing slash normalization
- `rel="next"` / `rel="prev"` — pagination links
- `rel="alternate"` — hreflang and feed links (critical for international SEO)
- `rel="author"`, `rel="license"`, `rel="help"`, `rel="search"`, `rel="pingback"`

::code-block
```html [Before]
<meta property="og:image" content="/images/hero.jpg">
<link rel="alternate" hreflang="es" href="/es/page">
```

```html [After]
<meta property="og:image" content="https://mysite.com/images/hero.jpg">
<link rel="alternate" hreflang="es" href="https://mysite.com/es/page">
```
::

## How Do I Set Up the Canonical Plugin?

Install the plugin in both your server & client entries:

::code-block
```ts [Input]
import { CanonicalPlugin } from 'unhead/plugins'

const head = createHead({
  plugins: [
    CanonicalPlugin({
      canonicalHost: 'https://mysite.com'
    })
  ]
})
```
::

## How Does Query Parameter Filtering Work?

Tracking parameters like `utm_source`, `fbclid`, and `gclid` create duplicate URLs that dilute your SEO. The plugin automatically strips **all** query parameters from canonical and `og:url` tags by default.

::code-block
```html [Before]
<link rel="canonical" href="https://mysite.com/blog?page=2&utm_source=twitter&fbclid=abc">
```

```html [After]
<link rel="canonical" href="https://mysite.com/blog">
```
::

### How Do I Preserve Specific Query Parameters?

If your site uses query parameters that affect content (e.g. pagination, filters), pass them via `queryWhitelist`:

::code-block
```ts [Input]
CanonicalPlugin({
  canonicalHost: 'https://mysite.com',
  queryWhitelist: ['page', 'sort', 'q', 'category']
})
```
::

Common parameters you may want to whitelist:

- `page` - Pagination
- `sort` - Sort order
- `filter` - Content filters
- `search`, `q` - Search queries
- `category`, `tag` - Category/tag filters
- `lang`, `locale` - Language variants

### How Do I Disable Query Filtering?

Set `queryWhitelist` to `false` to keep all query parameters:

::code-block
```ts [Input]
CanonicalPlugin({
  canonicalHost: 'https://mysite.com',
  queryWhitelist: false
})
```
::

::tip
Query filtering only applies to `rel="canonical"` and `og:url` tags. Image and video URLs (`og:image`, `twitter:image`, etc.) are never filtered, since their query parameters often control dimensions and formats.
::

## How Does Trailing Slash Normalization Work?

Inconsistent trailing slashes (`/about` vs `/about/`) create duplicate canonical URLs. Use the `trailingSlash` option to enforce consistency:

::code-block
```ts [Input]
// Always add trailing slash
CanonicalPlugin({
  canonicalHost: 'https://mysite.com',
  trailingSlash: true
})

// Always remove trailing slash
CanonicalPlugin({
  canonicalHost: 'https://mysite.com',
  trailingSlash: false
})
```
::

::tip
The root path `/` is never stripped of its trailing slash, even when `trailingSlash` is `false`.
::

## Does the Plugin Strip URL Fragments?

Yes. Hash fragments (e.g. `#section`) are automatically removed from canonical and `og:url` tags. Search engines ignore fragments, and leaving them in can create unnecessary URL variations.

## What Are the Configuration Options?

::code-block
```ts [Input]
interface CanonicalPluginOptions {
  // Your site's domain (required)
  canonicalHost?: string
  // Optional: Custom function to transform URLs
  customResolver?: (path: string) => string
  // Query parameters to preserve (default: [] — strips all)
  // Set to false to disable filtering
  queryWhitelist?: string[] | false
  // Normalize trailing slashes (true = add, false = remove, undefined = leave as-is)
  trailingSlash?: boolean
}
```
::

### What Happens If I Don't Set canonicalHost?

- If no `canonicalHost` is provided:
  - Client-side: Uses `window.location.origin`
  - SSR: Leaves URLs as-is (relative)

::tip
Always set `canonicalHost` explicitly for consistent behavior across environments.
::

### How Do I Customize URL Resolution?

Use `customResolver` to implement custom URL transformation logic:

::code-block
```ts [Input]
CanonicalPlugin({
  canonicalHost: 'https://mysite.com',
  customResolver: path => new URL(`/cdn${path}`, 'https://example.com').toString()
})
```
::

Example transformation:

::code-block
```html [Before]
<meta property="og:image" content="/hero.jpg">
```

```html [After]
<meta property="og:image" content="https://mysite.com/cdn/hero.jpg">
```
::

## How Do I Integrate with a CDN?

Point image assets to your CDN domain:

::code-block
```ts [Input]
CanonicalPlugin({
  canonicalHost: 'https://mysite.com',
  customResolver: (path) => {
    // Send image paths to CDN, keep other URLs on main domain
    if (path.match(/\.(jpg|png|webp|gif|svg)$/i))
      return `https://cdn.mysite.com${path}`
    return `https://mysite.com${path}`
  }
})
```
::

## Framework Setup Guides

### Nuxt

Nuxt has built-in Unhead support. Register the plugin in a [Nuxt plugin](https://nuxt.com/docs/guide/directory-structure/plugins):

::code-block
```ts [plugins/canonical.ts]
import { injectHead } from '@unhead/vue'
import { CanonicalPlugin } from 'unhead/plugins'

export default defineNuxtPlugin(() => {
  const head = injectHead()
  head.use(CanonicalPlugin({
    canonicalHost: 'https://mysite.com'
  }))
})
```
::

### Vue

Register the plugin when creating your head instance:

::code-block
```ts [main.ts]
import { createHead } from '@unhead/vue/client'
import { CanonicalPlugin } from 'unhead/plugins'

const head = createHead({
  plugins: [
    CanonicalPlugin({
      canonicalHost: 'https://mysite.com'
    })
  ]
})

app.use(head)
```
::

### React

Register the plugin in your app entry:

::code-block
```tsx [app.tsx]
import { createHead } from '@unhead/react/client'
import { CanonicalPlugin } from 'unhead/plugins'

const head = createHead({
  plugins: [
    CanonicalPlugin({
      canonicalHost: 'https://mysite.com'
    })
  ]
})
```
::

### Svelte

Register the plugin when creating the head instance in your entry file:

::code-block
```ts [src/entry-client.ts]
import { createHead, UnheadContextKey } from '@unhead/svelte/client'
import { CanonicalPlugin } from 'unhead/plugins'

const head = createHead()
head.use(CanonicalPlugin({
  canonicalHost: 'https://mysite.com'
}))
```
::

### Angular

Register the plugin via `provideClientHead` options:

::code-block
```ts [app.config.ts]
import { provideClientHead } from '@unhead/angular'
import { CanonicalPlugin } from 'unhead/plugins'

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHead({
      plugins: [
        CanonicalPlugin({
          canonicalHost: 'https://mysite.com'
        })
      ]
    })
  ]
}
```
::

## Related

- [Template Params](/docs/head/guides/plugins/template-params) - Dynamic template parameters
- [Infer SEO Meta](/docs/head/guides/plugins/infer-seo-meta-tags) - Auto-generate SEO tags
