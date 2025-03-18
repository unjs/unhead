---
title: "Canonical Plugin"
description: "Fix relative URLs in your meta tags automatically for better SEO"
navigation.title: "Canonical Plugin"
---

## Introduction

The Canonical Plugin automatically converts relative URLs to absolute URLs in your meta tags, which is essential for:

- [Google SEO](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): Requires absolute URLs for canonical links
- [Facebook](https://developers.facebook.com/docs/sharing/webmasters/getting-started): Ignores relative image paths in Open Graph tags
- [Twitter](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/markup): Requires absolute URLs for Twitter Card images

## How It Works

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

## Setup

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

## Configuration

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

### Fallback Behavior

- If no `canonicalHost` is provided:
  - Client-side: Uses `window.location.origin`
  - SSR: Leaves URLs as-is (relative)

::tip
Always set `canonicalHost` explicitly for consistent behavior across environments.
::

### Custom URL Resolution

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

## Common Use Cases

### CDN Integration

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
