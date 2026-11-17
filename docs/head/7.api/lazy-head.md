---
title: Lazy Head
description: API reference for the lazy head, the client head that loads its DOM runtime on the first head change.
---

```ts
import { createHead } from '@unhead/vue/lazy'

const head = createHead()
app.use(head)
app.mount('#app')
// Hydration has ended.
head.render()
```

The [lazy head](/docs/vue/head/guides/core-concepts/lazy-head) is a client head for a server rendered page. It stores entries without touching the document. It loads the standard DOM runtime on the first head change, or when `load()` runs.

::note
The lazy head is experimental. Its API may change in a minor release.
::

## Entry points

| Entry point | Exports |
| --- | --- |
| `@unhead/vue/lazy` | `createHead`, and the types `LazyHeadOptions` and `LazyVueHead` |
| `unhead/lazy` | `createHead`, and the types `LazyHeadOptions` and `LazyUnhead` |

The Vue export adds the Vue plugin install. During hydration, it also loads the runtime at once for a call the server never ran, such as `useHead()` in `onMounted()`. In development, it names components in the dev warning. Use `unhead/lazy` only to build an adapter for another framework.

## API Reference

```ts
function createHead(options?: LazyHeadOptions): LazyVueHead
```

### Options

`LazyHeadOptions` takes every option of the client `createHead()`, plus these:

| Option | Type | Description |
| --- | --- | --- |
| `lazyPlugins` | `() => Promise<HeadPluginInput[]>` | Plugins that load with the runtime. Their code stays out of the eager chunk. |
| `onLoadError` | `(error: unknown) => void` | Receives the error when the runtime chunk or the `lazyPlugins` loader fails, or when a custom `render` throws during the load. The default logs with `console.error`. |

A custom `render` option owns the document. The runtime never adopts the server head. After the load, each change calls your `render`.

### Returns

The head has the methods of the client head. It adds `load()` and changes `render()`:

| Method | Description |
| --- | --- |
| `load()` | Loads the runtime now. Safe to call more than once. Resolves `true` on success and `false` on failure. A failed load resets, so a later change or `load()` tries again. Call it at once for a page with no server render, or for a head created after hydration. Before hydration ends, a load that no change started means no server head applies, so the head adopts nothing. |
| `render()` | Before the runtime loads, the first call marks the end of hydration. A later call loads the runtime if entries changed, unless a `dom:beforeRender` pause holds it. After the runtime loads, it renders. |

After hydration, a `dom:beforeRender` pause holds the load. Pause during a navigation, and call `render()` when it ends. Before hydration ends, a change loads the runtime at once. A `load()` call and a `useScript()` load skip the pause, but the runtime renders nothing until the pause lifts.

## Chunks

| Chunk | Loads | Size, gzip |
| --- | --- | --- |
| The eager entry | With the app | About 2.2 KB with `@unhead/vue` |
| The runtime | With the first head change | About 4.5 KB |
| The dev check | In development, after hydration | None in production |

A renderer that adds prefetch hints for dynamic imports downloads the runtime at once. Read [Prefetch hints](/docs/vue/head/guides/core-concepts/lazy-head#prefetch-hints) to keep the runtime out of them.

## Dev warning

In development, the first `render()` checks the tags the client would render against the server head in the document. It warns once per tag and source for the browser tab. It does not run if the runtime already loads. Read [Dev warning](/docs/vue/head/guides/core-concepts/lazy-head#dev-warning) for the message and the fix.

The check reads `process.env.NODE_ENV`. A production build replaces it with `'production'` and drops the check.

## Template params

Pass `TemplateParamsPlugin` in `plugins`, as on the client head. To keep its code out of the eager chunk, pass it in `lazyPlugins`, so it loads with the runtime.
