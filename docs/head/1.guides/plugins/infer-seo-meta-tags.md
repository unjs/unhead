---
title: "Infer SEO Meta"
description: "Automatically infer SEO meta tags from your page title and description"
navigation.title: "Infer SEO Meta"
---

## Introduction

Unhead is internally powered by a hook system which you can plug into to add your own logic.

The Infer SEO Meta plugin automatically generates Open Graph and Twitter meta tags from your existing content:

- `og:title` - Inferred from your page title
- `og:description` - Inferred from your description meta
- `twitter:card` - Set automatically when using `og:image`

This helps maintain consistent metadata across platforms without duplicating content.

## Setup

Add the plugin to your Unhead configuration:

::code-block
```ts [Input]
import { InferSeoMetaPlugin } from '@unhead/addons'

const head = createHead({
  plugins: [
    InferSeoMetaPlugin()
  ]
})

// or

head.use(InferSeoMetaPlugin())
```
::

## Configuration

You can customize how the plugin transforms your content:

::code-block
```ts [Input]
export interface InferSeoMetaPluginOptions {
  /**
   * Transform the og title.
   *
   * @param title
   */
  ogTitle?: ((title: string) => string)
  /**
   * Transform the og description.
   *
   * @param description
   */
  ogDescription?: ((description: string) => string)
  /**
   * The twitter card to use.
   *
   * @default 'summary_large_image'
   */
  twitterCard?: false | 'summary' | 'summary_large_image' | 'app' | 'player'
}
```
::

## Common Use Cases

### Custom OG Title Format

Remove site name suffix from Open Graph titles:

::code-block
```ts [Input]
import { InferSeoMetaPlugin } from '@unhead/addons'

const head = createHead({
  plugins: [
    InferSeoMetaPlugin({
      ogTitle: title => title.replace('- My Site', '')
    })
  ]
})
```
::

### Disable Twitter Card

If you don't want Twitter cards generated:

::code-block
```ts [Input]
InferSeoMetaPlugin({
  twitterCard: false
})
```
::

### Custom Description Formatting

Append a call-to-action to your Open Graph descriptions:

::code-block
```ts [Input]
InferSeoMetaPlugin({
  ogDescription: description => `${description} Learn more now!`
})
```
::
