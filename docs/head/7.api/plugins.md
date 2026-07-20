---
title: Plugins
description: Create custom plugins with defineHeadPlugin to hook into Unhead's tag resolution, DOM rendering, and SSR lifecycle.
---

Unhead uses a hook-based architecture. Plugins can inspect or modify entry resolution, resolved tags, DOM rendering, and server rendering.

## defineHeadPlugin

`defineHeadPlugin()` is a type helper for plugin objects and setup functions. An object plugin needs a stable `key` and may register hooks.

```ts
import { defineHeadPlugin } from 'unhead/plugins'

export const myPlugin = defineHeadPlugin({
  key: 'my-plugin',
  hooks: {
    'tags:resolve': (ctx) => {
      // Modify ctx.tags before rendering.
    },
  },
})
```

Plugins can also be setup functions that receive the `Unhead` instance. Pass a static key as the second argument when setup can have side effects; this lets Unhead deduplicate the plugin before invoking it again.

```ts
import { defineHeadPlugin } from 'unhead/plugins'
import { resolveTags } from 'unhead/utils'

export const myPlugin = defineHeadPlugin(head => ({
  key: 'my-plugin',
  hooks: {
    'entries:updated': () => {
      const tags = resolveTags(head)
      console.log('Current tags:', tags)
    },
  },
}), 'my-plugin')
```

### Registering Plugins

Pass plugins when creating the head instance, or add them later with `head.use()`.

```ts
import { createHead } from 'unhead/client'

const head = createHead({
  plugins: [myPlugin],
})

// or later
head.use(myPlugin)
```

## Custom Composables

You can wrap your framework's `useHead()` composable to create helpers for recurring patterns.

```ts
import { useHead } from '@unhead/dynamic-import'

export function useBodyClass(classes: string | string[]) {
  const classList = Array.isArray(classes) ? classes : [classes]
  return useHead({
    bodyAttrs: {
      class: classList.join(' '),
    },
  })
}
```

## Plugin Type

```ts
type HeadPluginInput =
  | (HeadPluginOptions & { key: string })
  | (((head: Unhead) => HeadPluginOptions & { key: string }) & {
      key?: string
    })

interface HeadPluginOptions extends CreateHeadOptions {
  hooks?: Record<string, (...args: any[]) => any>
}
```

`HeadPluginOptions` extends the core head-creation options at the type level. Plugin registration itself consumes the plugin's `key` and `hooks`; setup functions can use the supplied head instance to push entries or wrap instance methods before returning those hooks.

## See Also

- [Hooks API](/docs/head/api/get-started/overview#hooks) for the available hooks and their signatures
- [Built-in Plugins](/docs/head/guides/get-started/overview#what-plugins-are-available) for plugins that ship with Unhead
