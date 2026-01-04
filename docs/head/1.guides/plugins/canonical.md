---
title: "Canonical Plugin"
description: "Fix relative URLs in your meta tags automatically for better SEO"
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

## What Are the Configuration Options?

::code-block
```ts [Input]
interface CanonicalPluginOptions {
  // Your site's domain (required)
  canonicalHost?: string
  // Optional: Custom function to transform URLs
  customResolver?: (path: string) => string
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

## Related

- [Template Params](/docs/head/guides/plugins/template-params) - Dynamic template parameters
- [Infer SEO Meta](/docs/head/guides/plugins/infer-seo-meta-tags) - Auto-generate SEO tags
