---
title: "Alias Sorting"
description: "Order head tags with before: and after: prefixes. More readable than numeric priorities for script loading and CSS dependencies."
navigation.title: "Alias Sorting"
---

The Alias Sorting plugin orders same-weight tags with readable `before:` and `after:` relationships. For example, `tagPriority: 'before:script:analytics'` places one script before a keyed analytics script.

## Relative ordering

Numerical priorities become hard to maintain as your application grows:

- Numbers are arbitrary and their meaning isn't clear
- You need to know all existing priorities to insert a new tag
- Changing one priority might require updating many others

Aliases express the relationship between two tags directly. Keep chains in dependency order because the plugin resolves each alias in a single pass.

## Setup

Add the plugin to your Unhead configuration:

::code-block

```ts [Input]
import { createHead } from '@unhead/dynamic-import/client'
import { AliasSortingPlugin } from '@unhead/dynamic-import/plugins'

const head = createHead({
  plugins: [
    AliasSortingPlugin
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
<script src="/analytics.js" data-hid="analytics"></script>
```

::

### Alias format

The format is: `{before|after}:{tagName}:{key}`

Targets normally use the tag type and an explicit `key`. For example:

- `before:script:analytics`{lang="ts"}: Place before the analytics script
- `before:link:styles`{lang="ts"}: Place before the styles link tag

### Multiple Dependencies

You can order multiple tags relative to each other:

::code-block

```ts [Input]
useHead({
  script: [
    {
      key: 'first',
      src: '/a.js'
    },
    {
      key: 'second',
      src: '/b.js',
      tagPriority: 'after:script:first'
    },
    {
      key: 'third',
      src: '/c.js',
      tagPriority: 'after:script:second'
    }
  ]
})
```

```html [Output]
<script src="/a.js" data-hid="first"></script>
<script src="/b.js" data-hid="second"></script>
<script src="/c.js" data-hid="third"></script>
```

::

### Weight boundaries

Aliases adjust registration order after Unhead has calculated each tag's weight. They do not recalculate the aliasing tag's weight during the current resolution. Use aliases between tags that already share a weight, such as two ordinary scripts or two stylesheets; use numeric or named priorities when a tag must move to another weight group.

## Common Use Cases

### Critical CSS first

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

### Script tag order

Aliases control the order in which Unhead renders script tags:

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
      tagPriority: 'after:script:jquery'
    },
    {
      key: 'app',
      src: '/js/app.js',
      tagPriority: 'after:script:plugin'
    }
  ]
})
```

::

This controls tag order, not execution order. Dynamically inserted scripts follow the browser's script loading model, so use module imports, promises, or explicit load events when one script depends on another. See the [HTML script processing model](https://html.spec.whatwg.org/multipage/scripting.html#script-processing-model).

## Limits and conventions

- Use meaningful keys that describe the tag's purpose
- Keep dependency chains short
- Use numeric or named priorities to cross weight groups

::note
During hydration (SSR or page switches), tags may not reorder to avoid content flashing. The plugin respects this behavior.
::

## Related

- [Tag Positions](/docs/head/guides/core-concepts/positions): Control tag ordering
