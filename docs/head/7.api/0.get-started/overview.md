---
title: Overview
description: 'API reference for useHead(), useSeoMeta(), and useScript(), plus DOM and SSR rendering hooks with TypeScript signatures.'
---

Use `useHead()` for general head management, `useSeoMeta()` for SEO tags, and `useScript()` for script loading. The head composables return an entry with `patch()` and `dispose()`; `useScript()` returns a script controller.

## Composables

::div{class="grid grid-cols-2 gap-5"}

:UPageCard{ spotlight spotlight-color="primary" title="useHead()" description="The main composable for managing head tags." to="/docs/head/api/composables/use-head"}
:UPageCard{ spotlight spotlight-color="primary" title="useHeadSafe()" description="Restrictive filtering for untrusted head input." to="/docs/head/api/composables/use-head-safe"}
:UPageCard{ spotlight spotlight-color="primary" title="useSeoMeta()" description="A composable for managing SEO-related tags." to="/docs/head/api/composables/use-seo-meta"}
:UPageCard{ spotlight spotlight-color="primary" title="useScript()" description="A composable for loading and managing external scripts."  to="/docs/head/api/composables/use-script"}

::

## Plugins

See the [Plugins API](/docs/head/api/plugins) for creating custom plugins with `defineHeadPlugin`.

## Hooks

### Entry Hooks

- [entries:beforePush](/docs/head/api/hooks/entries-before-push): Called before an entry is created and can suppress the push
- [entries:beforeDispose](/docs/head/api/hooks/entries-before-dispose): Called before a client entry is disposed and can defer cleanup
- [entries:updated](/docs/head/api/hooks/entries-updated): Called after client entries change
- [entries:resolve](/docs/head/api/hooks/entries-resolve): Called before the entry snapshot is resolved to tags
- [entries:normalize](/docs/head/api/hooks/entries-normalize): Called after one entry has been normalized to tags

### Tag resolution

- [tag:normalise](/docs/head/api/hooks/tag-normalise): Reserved legacy hook; currently not emitted
- [tags:beforeResolve](/docs/head/api/hooks/tags-before-resolve): First hook over the resolved, deduplicated tag set
- [tags:resolve](/docs/head/api/hooks/tags-resolve): Called after `tags:beforeResolve`
- [tags:afterResolve](/docs/head/api/hooks/tags-after-resolve): Final tag-resolution hook before rendering

### DOM rendering

- [dom:beforeRender](/docs/head/api/hooks/dom-before-render): Called before resolving and rendering to the DOM (synchronous)

### Server rendering

- [ssr:beforeRender](/docs/head/api/hooks/ssr-before-render): Called before server-side rendering
- [ssr:render](/docs/head/api/hooks/ssr-render): Called after tags resolve but before serialization
- [ssr:rendered](/docs/head/api/hooks/ssr-rendered): Called with the final SSR payload

### Script loading

- [script:updated](/docs/head/api/hooks/script-updated): Internal hook emitted for script lifecycle status changes
