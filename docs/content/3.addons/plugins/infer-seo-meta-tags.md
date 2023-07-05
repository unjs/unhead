---
title: "Infer SEO Meta"
description: Automatically infer SEO meta tags from your page.
---

# Infer SEO Meta

Unhead is internally powered by a hook system which you can plug into to add your own logic.

One example of this is the inferring the SEO meta tags to display on your page before a render.

This plugin will automatically infer the `og:title`, `og:description` when a title and description are set respectively. 

It will also make sure a the `twitter:card` meta tag is set when using a `og:image`.

## Example

```ts
import { InferSeoMetaPlugin } from '@unhead/addons'

const head = createHead({
  plugins: [
    InferSeoMetaPlugin()
  ]
})

// or

head.use(InferSeoMetaPlugin())
```

If you'd like to configure the behavior of the plugin, you can pass in an options object.

```ts
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
   * @param title
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

## Examples

### Custom ogTitles

```ts
import { InferSeoMetaPlugin } from '@unhead/addons'

const head = createHead({
  plugins: [
    InferSeoMetaPlugin({
      ogTitle: title => title.replace('- My Site', '')
    })
  ]
})
```
