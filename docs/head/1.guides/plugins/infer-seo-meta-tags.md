---
title: "Infer SEO Meta"
description: "Auto-generate og:title, og:description, and twitter:card from existing title and description. Reduce duplicate meta tag definitions."
navigation.title: "Infer SEO Meta"
---

**Quick Answer:** The Infer SEO Meta plugin automatically generates `og:title`, `og:description`, and `twitter:card` from your existing `title` and `description` tags, reducing duplicate meta tag definitions.

## What Does This Plugin Do?

The Infer SEO Meta plugin automatically generates Open Graph and Twitter meta tags from your existing content:

- `og:title` - Inferred from your page title
- `og:description` - Inferred from your description meta
- `twitter:card` - Set automatically when using `og:image`

Use this plugin when you want to avoid duplicating your page title and description across Open Graph and Twitter meta tags. It's ideal for sites that need consistent social sharing metadata without manual repetition.

## How Does the Output Look?

::code-block
```ts [Input]
useHead({
  title: 'My Page Title',
  meta: [
    { name: 'description', content: 'A description of my page' }
  ]
})
```

```html [Output]
<title>My Page Title</title>
<meta name="description" content="A description of my page">
<meta property="og:title" content="My Page Title">
<meta property="og:description" content="A description of my page">
```
::

## How Do I Set Up the Plugin?

Add the plugin to your Unhead configuration:

::code-block
```ts [Input]
import { InferSeoMetaPlugin } from 'unhead/plugins'

const head = createHead({
  plugins: [
    InferSeoMetaPlugin()
  ]
})

// or

head.use(InferSeoMetaPlugin())
```
::

## What Options Can I Configure?

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

## How Do I Customize the OG Title?

Remove site name suffix from Open Graph titles:

::code-block
```ts [Input]
import { InferSeoMetaPlugin } from 'unhead/plugins'

const head = createHead({
  plugins: [
    InferSeoMetaPlugin({
      ogTitle: title => title.replace('- My Site', '')
    })
  ]
})
```
::

## How Do I Disable Twitter Cards?

If you don't want Twitter cards generated:

::code-block
```ts [Input]
InferSeoMetaPlugin({
  twitterCard: false
})
```
::

## How Do I Format OG Descriptions?

Append a call-to-action to your Open Graph descriptions:

::code-block
```ts [Input]
InferSeoMetaPlugin({
  ogDescription: description => `${description} Learn more now!`
})
```
::

## Related

- [useSeoMeta()](/docs/head/api/composables/use-seo-meta) - Manual SEO meta management
- [Template Params](/docs/head/guides/plugins/template-params) - Dynamic template parameters
