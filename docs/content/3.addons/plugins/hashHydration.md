---
title: "Hash Hydration"
description: "Reduce the client-side hydration mounting time by using hashes." 
---

# Hash Hydration Plugin

When using Unhead SSR and DOM, you have two important steps: SSR rendering an HTML response and hydrating that response so your app is reactive.

Hydration is expensive. Any walking or manipulation of the DOM will affect page loading performance.

For example, to hydrate the head tags of a site with 20 tags, may take around ~15ms (this is now ~50% faster as of 3.7.0 which took ~30ms).

In many cases though the head data from the SSR HTML response and the initial mount will be identical. If we can delay the hydration logic until we're introducing new tags client side, then we can reduce the initial time for our app to be ready.

To do so, you can use the HashHydrationPlugin that creates hashes of the tags that need to be rendered, 
so we can figure out if a hydration step is needed. 

## Installation

```ts
import { HashHydrationPlugin } from 'unhead'

const head = createHead({
  plugins: [
    HashHydrationPlugin()
  ]
})

// or

head.use(HashHydrationPlugin())
```

This will add a tag to your HTML `<meta name="unhead:ssr" content=":hash:">`.

### Testing Feedback

If you are using Hash Hydration, please let me know how it goes by commenting on [this discussion](https://github.com/nuxt/nuxt/discussions/22632).
