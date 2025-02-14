---
title: "Alias Sorting"
description: "Control tag order with before: and after: aliases"
---

The Alias Sorting plugin lets you control tag order using `before:` and `after:` prefixes instead of numerical priorities.

## Why Use Aliases?

Numerical priorities can become hard to maintain as your app grows:

- Numbers are arbitrary and their meaning isn't clear
- You need to know all existing priorities to insert a new tag
- Changing one priority might require updating many others

Aliases make tag ordering more intuitive and maintainable.

## Setup

Add the plugin to your Unhead configuration:

```ts
import { AliasSortingPlugin } from 'unhead/plugins'
import { createHead } from 'unhead'

const head = createHead({
  plugins: [
    AliasSortingPlugin()
  ]
})
```

## Usage

### Basic Ordering

Use `before:` or `after:` with the tag type and key:

```ts
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

// Output:
// <script src="/critical.js"></script>
// <script src="/analytics.js"></script>
```

### Referencing Tags

The format is: `{before|after}:{tagName}:{key}`

For example:
- `before:script:analytics`
- `after:meta:description`
- `before:link:styles`

### Multiple Dependencies

You can order multiple tags relative to each other:

```ts
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

### Combining with Numeric Priorities

Alias sorting works alongside numeric priorities. The plugin will preserve the numeric priority of the referenced tag:

```ts
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

## Best Practices

- Use meaningful keys that describe the tag's purpose
- Keep dependencies simple - avoid complex chains
- Consider using numeric priorities for critical tags
- Document your tag ordering strategy for your team

## Hydration Note

During hydration (SSR or page switches), tags may not reorder to avoid content flashing. The plugin respects this behavior.
