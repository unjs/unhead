---
title: Critical Tags
description: Add tags that are critical to your page load.
---

There are a few tags that are critical to your page load.

Using a useHead like this at a root level will ensure your site works as expected.

```ts
useHead({
  htmlAttrs: {
    lang: 'en' // Change to your language  
  },
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ]
})
```
