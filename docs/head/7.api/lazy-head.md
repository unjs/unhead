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

`load()` rejects if activation fails. For streaming, the matching server bootstrap must be present when you call `load()`. If a plugin loader fails or the stream queue is missing, another `load()` can retry once the issue is resolved.

`finishHydration()` and `render()` leave activation to the caller. In development, `finishHydration()` can check for differences between queued client tags and the server tags on buffered SSR pages.

Vue's `useScript()` can register scripts before the runtime loads. Framework integrations that access `head.hooks` directly before calling `useScript()` can supply `hookable` when they create the shell. Subscriptions carry through activation. Plugins can read `entries` during tag resolution.

Use the full client head returned by `load()` for other runtime APIs.

See the [Vue setup guide](/docs/vue/head/guides/core-concepts/lazy-head) for hydration, streaming, and client-only pages.
