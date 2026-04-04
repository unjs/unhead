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

The plugin transforms these tags automatically:

- `og:image` and `twitter:image` meta tags
- `og:url` meta tag
- `rel="canonical"` link tag

::code-block
```html [Before]
<meta property="og:image" content="/images/hero.jpg">
```

```html [After]
<meta property="og:image" content="https://mysite.com/images/hero.jpg">
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

Tracking parameters like `utm_source`, `fbclid`, and `gclid` create duplicate URLs that dilute your SEO. The plugin automatically strips query parameters from canonical and `og:url` tags, keeping only content-affecting parameters.

### Default Whitelisted Parameters

These parameters are preserved by default:

- `page` - Pagination
- `sort` - Sort order
- `filter` - Content filters
- `search` - Search queries
- `q` - Search queries
- `category` - Category filters
- `tag` - Tag filters

All other query parameters (e.g. `utm_source`, `fbclid`, `gclid`, `ref`) are stripped automatically.

::code-block
```html [Before]
<link rel="canonical" href="https://mysite.com/blog?page=2&utm_source=twitter&fbclid=abc">
```

```html [After]
<link rel="canonical" href="https://mysite.com/blog?page=2">
```
::

### How Do I Customize the Query Whitelist?

Pass a custom list of parameter names to keep:

::code-block
```ts [Input]
CanonicalPlugin({
  canonicalHost: 'https://mysite.com',
  queryWhitelist: ['page', 'lang', 'variant']
})
```
::

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

### How Do I Strip All Query Parameters?

Pass an empty array to remove all query parameters from canonical URLs:

::code-block
```ts [Input]
CanonicalPlugin({
  canonicalHost: 'https://mysite.com',
  queryWhitelist: []
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
  // Query parameters to preserve (default: ['page', 'sort', 'filter', 'search', 'q', 'category', 'tag'])
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
import { createHead } from '@unhead/vue'
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
import { createHead } from '@unhead/react'
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

Use `useUnhead()` to access the head instance and register the plugin:

::code-block
```ts [+layout.ts]
import { useUnhead } from '@unhead/svelte'
import { CanonicalPlugin } from 'unhead/plugins'

const head = useUnhead()
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
