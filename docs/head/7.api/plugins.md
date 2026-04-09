---
title: Plugins
description: Create custom plugins with defineHeadPlugin to hook into Unhead's tag resolution, DOM rendering, and SSR lifecycle.
---

Unhead uses a hooks-based architecture powered by [unjs/hookable](https://github.com/unjs/hookable). Plugins let you tap into different parts of the head tag management lifecycle.

## defineHeadPlugin

A type helper for creating plugins. A plugin is an object with a `key` and optional `hooks`.

```ts
import { defineHeadPlugin } from 'unhead/plugins'

export const myPlugin = defineHeadPlugin({
  key: 'my-plugin',
  hooks: {
    'tags:resolve': (ctx) => {
      // modify ctx.tags before rendering
    }
  }
})
```

Plugins can also be a function that receives the `Unhead` instance:

```ts
import { defineHeadPlugin } from 'unhead/plugins'
import { resolveTags } from 'unhead/utils'

export const myPlugin = defineHeadPlugin((head) => ({
  key: 'my-plugin',
  hooks: {
    'entries:updated': () => {
      const tags = resolveTags(head)
      console.log('Current tags:', tags)
    }
  }
}))
```

### Registering Plugins

Pass plugins when creating the head instance, or add them later with `head.use()`.

```ts
import { createHead } from 'unhead'

const head = createHead({
  plugins: [myPlugin]
})

// or later
head.use(myPlugin)
```

## Custom Composables

Unhead's composables are built on top of `useHead()`. You can create your own for common patterns.

```ts
import { useHead } from 'unhead'

export function useBodyClass(classes: string | string[]) {
  const classList = Array.isArray(classes) ? classes : [classes]
  return useHead({
    bodyAttrs: {
      class: classList.join(' ')
    }
  })
}
```

## Plugin Type

```ts
type HeadPluginInput =
  | (HeadPluginOptions & { key: string })
  | ((head: Unhead) => HeadPluginOptions & { key: string })

interface HeadPluginOptions {
  hooks?: Record<string, (...args: any[]) => any>
}
```

## See Also

- [Hooks API](/docs/head/api/hooks) for the full list of available hooks and their signatures
- [Built-in Plugins](/docs/head/guides/plugins) for plugins that ship with Unhead
