---
title: Overview
description: 'Unhead API reference for useHead(), useSeoMeta(), useScript() composables and DOM/SSR rendering hooks. Full TypeScript support.'
---

**Quick Reference:** The main composables are `useHead()` for general head management, `useSeoMeta()` for SEO tags, and `useScript()` for script loading. All return an entry with `patch()` and `dispose()` methods.

## What composables are available?

::div{class="grid grid-cols-2 gap-5"}

:UPageCard{ spotlight spotlight-color="primary" title="useHead()" description="The main composable for managing head tags." to="/docs/head/api/composables/use-head"}
:UPageCard{ spotlight spotlight-color="primary" title="useHeadSafe()" description="XSS-safe head management for user-generated content." to="/docs/head/api/composables/use-head-safe"}
:UPageCard{ spotlight spotlight-color="primary" title="useSeoMeta()" description="A composable for managing SEO-related tags." to="/docs/head/api/composables/use-seo-meta"}
:UPageCard{ spotlight spotlight-color="primary" title="useScript()" description="A composable for loading and managing external scripts."  to="/docs/head/api/composables/use-script"}

::

## What hooks can I use?

### How do I hook into entry updates?

- [entries:updated](/docs/head/api/hooks/entries-updated) - Called when entries have been updated
- [entries:resolve](/docs/head/api/hooks/entries-resolve) - Called when entries need to be resolved to tags
- [entries:normalize](/docs/head/api/hooks/entries-normalize) - Called when an entry is being normalized to tags

### How do I hook into tag resolution?

- [tag:normalise](/docs/head/api/hooks/tag-normalise) - Called when a tag is being normalized
- [tags:beforeResolve](/docs/head/api/hooks/tags-before-resolve) - Called before tags are resolved for rendering
- [tags:resolve](/docs/head/api/hooks/tags-resolve) - Called when tags are being resolved for rendering
- [tags:afterResolve](/docs/head/api/hooks/tags-after-resolve) - Called after tags have been resolved

### How do I hook into DOM rendering?

- [dom:beforeRender](/docs/head/api/hooks/dom-before-render) - Called before rendering to the DOM
- [dom:renderTag](/docs/head/api/hooks/dom-render-tag) - Called when a tag is being rendered to the DOM
- [dom:rendered](/docs/head/api/hooks/dom-rendered) - Called after tags have been rendered to the DOM

### How do I hook into server-side rendering?

- [ssr:beforeRender](/docs/head/api/hooks/ssr-before-render) - Called before server-side rendering
- [ssr:render](/docs/head/api/hooks/ssr-render) - Called during server-side rendering
- [ssr:rendered](/docs/head/api/hooks/ssr-rendered) - Called after server-side rendering

### How do I hook into script loading?

- [script:updated](/docs/head/api/hooks/script-updated) - Called when a script instance is updated
