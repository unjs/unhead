---
title: Lazy Head
description: API reference for the lazy head, the client head that loads its DOM runtime on the first head change.
---

```ts
import { createHead } from '@unhead/vue/lazy'

const head = createHead()
app.use(head)
```

The [lazy head](/docs/vue/head/guides/core-concepts/lazy-head) is a client head for a server rendered page. It stores entries without touching the document. It loads the standard DOM runtime on the first head change, at idle with `load: 'idle'`, or when `load()` runs.

::note
The lazy head is experimental. Its API may change in a minor release.
::

## Entry points

| Entry point | Exports |
| --- | --- |
| `@unhead/vue/lazy` | `createHead` |
| `unhead/lazy` | `createHead` |

The Vue export adds the Vue plugin install. It also loads the runtime at once for a call the server never ran, and names components in the dev warning. Use `unhead/lazy` only to build an adapter for another framework.

## API Reference

```ts
function createHead(options?: LazyHeadOptions): LazyVueHead
```

### Options

`LazyHeadOptions` takes every option of the client `createHead()`, plus these:

| Option | Type | Description |
| --- | --- | --- |
| `load` | `'change' \| 'idle'` | When the runtime loads after hydration. `'change'`, the default, loads on the first head change. `'idle'` loads at browser idle. |
| `lazyPlugins` | `() => Promise<HeadPluginInput[]>` | Plugins that load with the runtime. Their code stays out of the eager chunk. |
| `onLoadError` | `(error: unknown) => void` | Receives the error when the runtime chunk fails to load. The default logs with `console.error`. |

A custom `render` option owns the document. With it, every change loads the runtime.

### Returns

The head has the methods of the client head, plus these:

| Method | Description |
| --- | --- |
| `load()` | Loads the runtime now. Safe to call more than once. Resolves `true` on success and `false` on failure. |
| `blockLoad()` | Blocks the load during a navigation. The next `render()` releases it. A direct `load()` still runs. An idle load renders only after the release. |
| `render()` | Before the runtime loads, it marks the end of hydration and releases a load block. If entries changed, it loads the runtime at once, unless a `dom:beforeRender` pause blocks it. After the runtime loads, it renders. |

## Chunks

| Chunk | Loads | Size, gzip |
| --- | --- | --- |
| The eager entry | With the app | About 2.8 KB with `@unhead/vue` |
| The runtime | With the first head change | About 5 KB |
| The dev check | In development, after hydration | None in production |

A renderer that adds prefetch hints for dynamic imports downloads the runtime at once. Read [Lazy Head Integration](/docs/nuxt/head/guides/framework-integration/lazy-head#turn-off-prefetch-hints) to turn the hints off.

## Dev warning

In development, the first `render()` checks the tags the client would render against the server head in the document. It warns once per tag and source for the browser tab. It does not run with `load: 'idle'`. Read [Dev warning](/docs/vue/head/guides/core-concepts/lazy-head#dev-warning) for the message and the fix.

The check reads `process.env.NODE_ENV`. A production build replaces it with `'production'` and drops the check.

## Template params

Pass `TemplateParamsPlugin` in `plugins`, as on the client head. To keep its code out of the eager chunk, pass it in `lazyPlugins`, so it loads with the runtime.
