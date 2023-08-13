---
title: use
description: Add a plugin to Unhead.
---

# use

**Type:**

```ts
export type use = (plugin: HeadPlugin) => void
```

Adds a plugin to Unhead.

This will register the hooks used by the plugin.

## Example

```ts
import { createHead } from 'unhead'

const head = createHead()

const deleteFooPlugin = defineHeadPlugin({
  hooks: {
    'tag:normalise': function ({ tag }) {
      delete tag.props.foo
    },
  }
})

head.use(deleteFooPlugin)
```
