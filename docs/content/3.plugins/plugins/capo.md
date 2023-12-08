---
title: "Capo.js"
description: "Sort your tags in a more performant way by using the Capo.js plugin."
---

[Capo.js](https://rviscomi.github.io/capo.js/) is an awesome project trying to bring some structure to the head, making sure tags are rendered in
a specific way to get the best performance.

The plugin is experimental and may be moved in to the core with more testing.

## Installation

```ts
import { CapoPlugin } from 'unhead'

const head = createHead({
  plugins: [
    CapoPlugin()
  ]
})

// or

head.use(CapoPlugin())
```

It's recommended that you use the `CapoPlugin` only on the server side. Using on the client side is not an issue, but it's not necessary.

### Options

- `track` - `boolean` - Whether to add a `data-capo` to the `<html>` so that performance can be monitored after adding the plugin. Defaults to `false`.

```ts
import { CapoPlugin } from 'unhead'

const head = createHead({
  plugins: [
    CapoPlugin({ track: true })
  ]
})
```

### Testing Feedback

If you are using Capo.js, please let me know how it goes by commenting on [this discussion](https://github.com/nuxt/nuxt/discussions/22632).
