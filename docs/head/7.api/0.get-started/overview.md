---
title: Overview
---

## Composables

::div{class="grid grid-cols-2 gap-5"}

:UPageCard{ spotlight spotlight-color="primary" title="useHead()" description="The main composable for managing head tags." to="/api/composables/use-head"}
:UPageCard{ spotlight spotlight-color="primary" title="useHeadSafe()" description="The main composable for managing head tags." to="/api/composables/use-head-safe"}
:UPageCard{ spotlight spotlight-color="primary" title="useSeoMeta()" description="A composable for managing SEO-related tags." to="/api/composables/use-seo-meta"}
:UPageCard{ spotlight spotlight-color="primary" title="useScript()" description="A composable for loading and managing external scripts."  to="/api/composables/use-script"}

::

## Hooks

### Initialization Hooks

- [init](/docs/head/api/hooks/init) - **Deprecated** Called when the head instance is initialized

### Entry Hooks

- [entries:updated](/docs/head/api/hooks/entries-updated) - Called when entries have been updated
- [entries:resolve](/docs/head/api/hooks/entries-resolve) - Called when entries need to be resolved to tags
- [entries:normalize](/docs/head/api/hooks/entries-normalize) - Called when an entry is being normalized to tags

### Tag Resolve Hooks

- [tag:normalise](/docs/head/api/hooks/tag-normalise) - Called when a tag is being normalized
- [tags:beforeResolve](/docs/head/api/hooks/tags-beforeResolve) - Called before tags are resolved for rendering
- [tags:resolve](/docs/head/api/hooks/tags-resolve) - Called when tags are being resolved for rendering
- [tags:afterResolve](/docs/head/api/hooks/tags-afterResolve) - Called after tags have been resolved

### DOM Rendering Hooks

- [dom:beforeRender](/docs/head/api/hooks/dom-beforeRender) - Called before rendering to the DOM
- [dom:renderTag](/docs/head/api/hooks/dom-renderTag) - Called when a tag is being rendered to the DOM
- [dom:rendered](/docs/head/api/hooks/dom-rendered) - Called after tags have been rendered to the DOM

### SSR Hooks

- [ssr:beforeRender](/docs/head/api/hooks/ssr-beforeRender) - Called before server-side rendering
- [ssr:render](/docs/head/api/hooks/ssr-render) - Called during server-side rendering
- [ssr:rendered](/docs/head/api/hooks/ssr-rendered) - Called after server-side rendering

### Script Hooks

- [script:updated](/docs/head/api/hooks/script-updated) - Called when a script instance is updated
