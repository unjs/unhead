---
title: "Alias Sorting"
description: "Control tag order with before: and after: aliases instead of numeric priorities"
navigation.title: "Alias Sorting"
---

## Introduction

The Alias Sorting plugin lets you control tag order using descriptive `before:` and `after:` prefixes instead of numerical priorities.

## Why Use Aliases?

Numerical priorities become hard to maintain as your application grows:

- Numbers are arbitrary and their meaning isn't clear
- You need to know all existing priorities to insert a new tag
- Changing one priority might require updating many others

Aliases make tag ordering more intuitive and maintainable with declarative relationships between tags.

## Setup

Add the plugin to your Unhead configuration:

::code-block
```ts [Input]
import { createHead } from 'unhead'
import { AliasSortingPlugin } from 'unhead/plugins'

const head = createHead({
  plugins: [
    AliasSortingPlugin()
  ]
})
```
::

## Usage

### Basic Ordering

Use `before:` or `after:` with the tag type and key:

::code-block
```ts [Input]
useHead({
  // First script
  script: [{
    key: 'analytics',
    src: '/analytics.js'
  }],
})

useHead({
  // This will render before analytics.js
  script: [{
    src: '/critical.js',
    tagPriority: 'before:script:analytics'
  }]
})
```

```html [Output]
<script src="/critical.js"></script>
<script src="/analytics.js"></script>
```
::

### Referencing Tags

The format is: `{before|after}:{tagName}:{key}`

For example:
- `before:script:analytics`{lang="ts"} - Place before the analytics script
- `after:meta:description`{lang="ts"} - Place after the description meta tag
- `before:link:styles`{lang="ts"} - Place before the styles link tag

### Multiple Dependencies

You can order multiple tags relative to each other:

::code-block
```ts [Input]
useHead({
  script: [
    {
      key: 'third',
      src: '/c.js',
      tagPriority: 'after:script:second'
    },
    {
      key: 'second',
      src: '/b.js',
      tagPriority: 'after:script:first'
    },
    {
      key: 'first',
      src: '/a.js'
    }
  ]
})
```

```html [Output]
<script src="/a.js"></script>
<script src="/b.js"></script>
<script src="/c.js"></script>
```
::

### Combining with Numeric Priorities

Alias sorting works alongside numeric priorities. The plugin will preserve the numeric priority of the referenced tag:

::code-block
```ts [Input]
useHead({
  script: [
    {
      key: 'high-priority',
      src: '/important.js',
      tagPriority: 0
    },
    {
      src: '/also-important.js',
      tagPriority: 'before:script:high-priority'
      // Will inherit priority 0 and render first
    }
  ]
})
```
::

## Common Use Cases

### Critical CSS Loading

Ensure critical CSS is loaded before other stylesheets:

::code-block
```ts [Input]
useHead({
  link: [
    {
      key: 'main-css',
      rel: 'stylesheet',
      href: '/css/main.css'
    },
    {
      key: 'critical-css',
      rel: 'stylesheet',
      href: '/css/critical.css',
      tagPriority: 'before:link:main-css'
    }
  ]
})
```
::

### Script Loading Order

Control the execution sequence of dependent scripts:

::code-block
```ts [Input]
useHead({
  script: [
    {
      key: 'jquery',
      src: '/js/jquery.js'
    },
    {
      key: 'plugin',
      src: '/js/jquery-plugin.js',
      tagPriority: 'after:script:jquery' // Ensure jQuery loads first
    },
    {
      key: 'app',
      src: '/js/app.js',
      tagPriority: 'after:script:plugin' // Load app.js last
    }
  ]
})
```
::

## Best Practices

- Use meaningful keys that describe the tag's purpose
- Keep dependencies simple - avoid complex chains
- Consider using numeric priorities for critical tags
- Document your tag ordering strategy for your team

::note
During hydration (SSR or page switches), tags may not reorder to avoid content flashing. The plugin respects this behavior.
::
