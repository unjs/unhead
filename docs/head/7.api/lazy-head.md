---
title: Lazy Head
description: API reference for queuing head entries and loading the client head on demand.
---

`createHead()` returns a small client shell. It queues head entries until the app calls `load()`, then forwards updates to the client head.

::note
The lazy head is experimental. Its API may change in a minor release.
::

| Entry point | Exports |
| --- | --- |
| `@unhead/vue/lazy` | `createHead`, `LazyHeadOptions`, and `LazyVueHead`. The shell also installs as a Vue plugin. |
| `@unhead/react/lazy` | `createHead` and `UnheadProvider`. |
| `@unhead/svelte/lazy` | `createHead` and `UnheadContextKey`. |
| `@unhead/solid-js/lazy` | `createHead` and `UnheadContext`. |
| `unhead/lazy` | `createHead`, `LazyHeadOptions`, and `LazyUnhead`. Use this entry point for framework adapters. |

## Options

`LazyHeadOptions` accepts the client `createHead()` options. The `hooks` and `plugins` options register when the runtime activates.

| Option | Type | Description |
| --- | --- | --- |
| `streamKey` | `string` | Connect to the queue written by the matching server bootstrap. Omit for buffered SSR or a client-only page. |
| `lazyPlugins` | `() => Promise<HeadPluginInput[]>` | Load plugins with the runtime. Use dynamic imports to keep plugin code out of the initial bundle. |
| `hookable` | `HookableCore<ClientHeadHooks>` | Supply a hook registry when a framework integration subscribes to hooks before activation. |

A custom `render` option controls rendering from activation onward. The default renderer adopts the server tags and applies queued changes.

## Methods

| Method | Behavior |
| --- | --- |
| `push(input, options?)` | Add an entry. Its `patch()` and `dispose()` work before and after activation. |
| `use(plugin)` | Register a plugin on activation or register it immediately if the runtime is active. |
| `finishHydration()` | Mark the end of hydration. Call this when your framework finishes collecting the initial entries. |
| `discardStream()` | Drop pending and applied patches from the initial server stream. Call this when leaving its page. It leaves runtime loading to the caller. |
| `load()` | Load and return the full client head as a `Promise`. Concurrent calls share the load. |
| `render()` | Forward to the client head when active. Before activation, return `false`. |

For streaming, call `load()` once the matching server bootstrap is present. If the stream queue is missing or a plugin loader fails, `load()` rejects. Fix the cause, then call `load()` again.

`finishHydration()` and `render()` leave activation to the caller. In development, `finishHydration()` can check for differences between queued client tags and the server tags on buffered SSR pages.

Vue's `useScript()` can register scripts before the runtime loads. Framework integrations that access `head.hooks` directly before calling `useScript()` can supply `hookable` when they create the shell. Subscriptions carry through activation. Plugins can read `entries` during tag resolution.

Use the full client head returned by `load()` for other runtime APIs.

## Preload the runtime

The framework Vite plugin adds a low-priority `modulepreload` hint to production HTML that uses the lazy head. Use `Unhead({ lazyHeadPreload: false })` to fetch the runtime when your app calls `load()`.

See the setup guides for [Vue](/docs/vue/head/guides/core-concepts/lazy-head), [React](/docs/react/head/guides/core-concepts/lazy-head), [Svelte](/docs/svelte/head/guides/core-concepts/lazy-head), and [Solid](/docs/solid-js/head/guides/core-concepts/lazy-head).
