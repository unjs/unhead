---
title: "Infer SEO Meta"
description: "Auto-generate og:title, og:description, and twitter:card from existing title and description. Reduce duplicate meta tag definitions."
navigation.title: "Infer SEO Meta"
---

The Infer SEO Meta plugin generates `og:title`, `og:description`, and `twitter:card` from your existing `title` and `description` tags.

The plugin generates these tags from existing content:

- `og:title`: Inferred from your page title
- `og:description`: Inferred from your description meta
- `twitter:card`: Added as `summary_large_image` by default, whether or not `og:image` is present

## Generated output

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
<meta name="twitter:card" content="summary_large_image">
```

::

## Setup

Add the plugin to your Unhead configuration:

::code-block

```ts [Input]
import { InferSeoMetaPlugin } from '@unhead/dynamic-import/plugins'

const head = createHead({
  plugins: [
    InferSeoMetaPlugin()
  ]
})

// or

head.use(InferSeoMetaPlugin())
```

::

## Options

The plugin accepts transforms for the generated title and description, plus a Twitter card setting:

::code-block

```ts [Input]
export interface InferSeoMetaPluginOptions {
  /**
   * Transform the og title.
   *
   * @param title
   */
  ogTitle?: ((title?: string) => string)
  /**
   * Transform the og description.
   *
   * @param description
   */
  ogDescription?: ((description?: string) => string)
  /**
   * The twitter card to use.
   *
   * @deprecated Set this to false and rely on Open Graph metadata instead.
   * @default 'summary_large_image'
   */
  twitterCard?: false | 'summary' | 'summary_large_image' | 'app' | 'player'
}
```

::

## Customizing the Open Graph title

Remove site name suffix from Open Graph titles:

::code-block

```ts [Input]
import { InferSeoMetaPlugin } from '@unhead/dynamic-import/plugins'

const head = createHead({
  plugins: [
    InferSeoMetaPlugin({
      ogTitle: (title = '') => title.replace('- My Site', '')
    })
  ]
})
```

::

## Disabling the Twitter card field

If you don't want Twitter cards generated:

::code-block

```ts [Input]
InferSeoMetaPlugin({
  twitterCard: false
})
```

::

## Formatting Open Graph descriptions

Append a call-to-action to your Open Graph descriptions:

::code-block

```ts [Input]
InferSeoMetaPlugin({
  ogDescription: (description = '') => `${description} Read the documentation.`
})
```

::

## Related

- [useSeoMeta()](/docs/head/api/composables/use-seo-meta): Manual SEO meta management
- [Template Params](/docs/head/guides/plugins/template-params): Dynamic template parameters
