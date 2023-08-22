---
title: 'How SSR works'
description: 'Get started with Unhead SSR by installing the dependency to your project.'
navigation:
  title: 'How it works'
---

When your client-side app hydrates the server head tags, it will attempt to hydrate each
element based on the nodes being equal `$el.isEqualNode($newEl)` or them sharing the same
dedupe key (see [Tag Deduping](/guide/guides/handling-duplicates)).

If you're rendering content that differs between client and server, you should
specify a `key` attribute if the element does not have a unique dedupe key.

```ts
useHead({
  script: [
    {
      // key is needed to avoid seperate scripts being created
      key: 'my-script',
      innerHTML: process.server ? '' : 'console.log("hello world")',
    }
  ]
})
```
