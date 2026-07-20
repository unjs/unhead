---
title: "Canonical Plugin"
description: "Normalize existing canonical, Open Graph, Twitter, pagination, and related URLs against a configured host."
navigation.title: "Canonical Plugin"
---

The Canonical plugin converts relative URLs in supported existing tags to absolute URLs. It does not create a canonical tag. Enable it with `CanonicalPlugin({ canonicalHost: 'https://mysite.com' })` in your head configuration.

## Why absolute URLs matter

The Canonical Plugin converts relative URLs to absolute URLs in supported meta and link tags. This matches the URL guidance for the two main standards it targets:

- [Google Search canonicalization](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): Relative canonical paths are supported, but Google recommends absolute paths to avoid long-term configuration mistakes
- [The Open Graph protocol](https://ogp.me/): Its URL type uses `http://` or `https://`, including `og:url`, image, audio, and video properties

## Transformed tags

The plugin resolves relative URLs to absolute URLs in all of these tags:

### Meta Tags

- `og:url`, `og:image`, `og:image:url`, `og:image:secure_url`
- `og:video`, `og:video:url`, `og:video:secure_url`
- `og:audio`, `og:audio:url`, `og:audio:secure_url`
- `twitter:image`, `twitter:image:src`
- `twitter:player`, `twitter:player:stream`

### Link Tags

- `rel="canonical"`: Query filtering, hash stripping, and trailing slash normalization
- `rel="next"` / `rel="prev"`: Pagination links
- `rel="alternate"`: `hreflang` and feed links
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

## Setup

Install the plugin in both your server and client entries:

::code-block

```ts [Input]
import { CanonicalPlugin } from '@unhead/dynamic-import/plugins'

const head = createHead({
  plugins: [
    CanonicalPlugin({
      canonicalHost: 'https://mysite.com'
    })
  ]
})
```

::

## Query parameter filtering

Tracking parameters such as `utm_source`, `fbclid`, and `gclid` can expose the same content at many URLs. Google recommends [trimming parameters that do not change page content](https://developers.google.com/search/docs/crawling-indexing/url-structure#best-practices). The plugin strips **all** query parameters from canonical and `og:url` tags by default, so whitelist every parameter that identifies distinct content.

::code-block

```html [Before]
<link rel="canonical" href="https://mysite.com/blog?page=2&utm_source=twitter&fbclid=abc">
```

```html [After]
<link rel="canonical" href="https://mysite.com/blog">
```

::

### Preserving specific parameters

If your site uses query parameters that affect content (e.g., pagination, filters), pass them via `queryWhitelist`:

::code-block

```ts [Input]
CanonicalPlugin({
  canonicalHost: 'https://mysite.com',
  queryWhitelist: ['page', 'sort', 'q', 'category']
})
```

::

Common parameters you may want to whitelist:

- `page`: Pagination
- `sort`: Sort order
- `filter`: Content filters
- `search`, `q`: Search queries
- `category`, `tag`: Category/tag filters
- `lang`, `locale`: Language variants

### Disabling query filtering

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

## Trailing slash normalization

If your server exposes `/about` and `/about/` as separate URLs for the same content, use `trailingSlash` to emit one consistent canonical form:

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

## URL fragments

Hash fragments (e.g., `#section`) are automatically removed from canonical and `og:url` tags. Google [generally does not support fragments in canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls#best-practices).

## Configuration options

::code-block

```ts [Input]
interface CanonicalPluginOptions {
  // Your site's domain; required during SSR
  canonicalHost?: string
  // Optional: Custom function to transform URLs
  customResolver?: (path: string) => string
  // Query parameters to preserve (default: []; strips all)
  // Set to false to disable filtering
  queryWhitelist?: string[] | false
  // Normalize trailing slashes (true = add, false = remove, undefined = leave as-is)
  trailingSlash?: boolean
}
```

::

### Omitting `canonicalHost`

- If no `canonicalHost` is provided:
  - Client-side: Uses `window.location.origin`
  - SSR: Throws while initializing the plugin because no valid base URL is available

::tip
Always set `canonicalHost` explicitly for consistent behavior across environments.
::

### Custom URL resolution

Use `customResolver` to implement custom URL transformation logic:

::code-block

```ts [Input]
CanonicalPlugin({
  canonicalHost: 'https://mysite.com',
  customResolver: path => /^https?:\/\//i.test(path) || path.startsWith('//')
    ? path
    : new URL(`/cdn/${path.replace(/^\/+/, '')}`, 'https://example.com').toString()
})
```

::

Example transformation:

::code-block

```html [Before]
<meta property="og:image" content="/hero.jpg">
```

```html [After]
<meta property="og:image" content="https://example.com/cdn/hero.jpg">
```

::

## CDN integration

The custom resolver receives every supported URL, including URLs that are already absolute. Preserve those before routing relative image paths to a CDN:

::code-block

```ts [Input]
CanonicalPlugin({
  canonicalHost: 'https://mysite.com',
  customResolver: (path) => {
    if (/^https?:\/\//i.test(path) || path.startsWith('//'))
      return path
    // Send image paths to CDN, keep other URLs on main domain
    if (path.match(/\.(jpg|png|webp|gif|svg)$/i))
      return new URL(path, 'https://cdn.mysite.com').toString()
    return new URL(path, 'https://mysite.com').toString()
  }
})
```

::

## Framework Setup Guides

Register the plugin when creating your head instance:

::FrameworkCode

#nuxt
```ts [plugins/canonical.ts]
import { injectHead } from '@unhead/vue'
import { CanonicalPlugin } from '@unhead/dynamic-import/plugins'

export default defineNuxtPlugin(() => {
  const head = injectHead()
  head.use(CanonicalPlugin({
    canonicalHost: 'https://mysite.com'
  }))
})
```

#vue
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

#react
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

#svelte
```ts [src/entry-client.ts]
import { createHead } from '@unhead/svelte/client'
import { CanonicalPlugin } from 'unhead/plugins'

const head = createHead()
head.use(CanonicalPlugin({
  canonicalHost: 'https://mysite.com'
}))
```

#angular
```ts [app.config.ts]
import { provideClientHead } from '@unhead/angular/client'
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

- [Template Params](/docs/head/guides/plugins/template-params): Dynamic template parameters
- [Infer SEO Meta](/docs/head/guides/plugins/infer-seo-meta-tags): Auto-generate SEO tags
