---
title: "Canonical Plugin"
description: Fix relative URLs in your meta tags automatically
---

## Introduction

[Google](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) requires your canonical URLs to use absolute paths. [Facebook](https://developers.facebook.com/docs/sharing/webmasters/getting-started) and [Twitter](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/markup) will ignore images without a full URL. This plugin fixes both problems automatically
when you provide a relative path.

The plugin converts relative paths to absolute URLs in these tags:
- `og:image` and `twitter:image` meta tags
- `og:url` meta tag
- `rel="canonical"` link tag

For example:
```html
<!-- Before -->
<meta property="og:image" content="/images/hero.jpg">

<!-- After -->
<meta property="og:image" content="https://mysite.com/images/hero.jpg">
```

## Setup

You should install the plugin in both your server & client entries.

```ts
import { CanonicalPlugin } from 'unhead/plugins'

const head = createHead({
  plugins: [
    CanonicalPlugin({
      canonicalHost: 'https://mysite.com'
    })
  ]
})
```

## Configuration

```ts
interface CanonicalPluginOptions {
  // Your site's domain (required)
  canonicalHost?: string
  // Optional: Custom function to transform URLs
  customResolver?: (path: string) => string
}
```

### Fallback Behavior

If no `canonicalHost` is provided, the plugin will fallback to the window location origin if client side.

For SSR it will just leave the URLs as is.

### Custom URL Resolution

Use `customResolver` to handle the transformation yourself. This function should return a fully qualified URL.

```ts
CanonicalPlugin({
  canonicalHost: 'https://mysite.com',
  customResolver: path => new URL(`/cdn${path}`, 'https://example.com').toString()
})
```

This would transform:
```html
<meta property="og:image" content="/hero.jpg">
<!-- to -->
<meta property="og:image" content="https://mysite.com/cdn/hero.jpg">
```
