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

- [init](/api/hooks/01.init) - Called when the head instance is initialized

### Entry Hooks

- [entries:updated](/api/hooks/02.entries-updated) - Called when entries have been updated
- [entries:resolve](/api/hooks/03.entries-resolve) - Called when entries need to be resolved to tags
- [entries:normalize](/api/hooks/04.entries-normalize) - Called when an entry is being normalized to tags

### Tag Resolve Hooks

- [tag:normalise](/api/hooks/05.tag-normalise) - Called when a tag is being normalized
- [tags:beforeResolve](/api/hooks/06.tags-beforeResolve) - Called before tags are resolved for rendering
- [tags:resolve](/api/hooks/07.tags-resolve) - Called when tags are being resolved for rendering
- [tags:afterResolve](/api/hooks/08.tags-afterResolve) - Called after tags have been resolved

### DOM Rendering Hooks

- [dom:beforeRender](/api/hooks/09.dom-beforeRender) - Called before rendering to the DOM
- [dom:renderTag](/api/hooks/10.dom-renderTag) - Called when a tag is being rendered to the DOM
- [dom:rendered](/api/hooks/11.dom-rendered) - Called after tags have been rendered to the DOM

### SSR Hooks

- [ssr:beforeRender](/api/hooks/12.ssr-beforeRender) - Called before server-side rendering
- [ssr:render](/api/hooks/13.ssr-render) - Called during server-side rendering
- [ssr:rendered](/api/hooks/14.ssr-rendered) - Called after server-side rendering

### Script Hooks

- [script:updated](/api/hooks/15.script-updated) - Called when a script instance is updated
