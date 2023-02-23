---
title: resolveTags
description: Generate the list of tags that will be rendered.
---

# resolveTags

**Type:**

```ts
() => Promise<HeadTag[]>
```

Generate the list of tags that will be rendered. This is used internally for DOM rendering and SSR render.


## Example

```ts
import { createHead } from 'unhead'

const head = createHead()

head.push({ title: 'Hello World '})

await head.resolveTags()

// [
//   { tag: 'title', props: { textContent: 'Hello World' } }
// ]
```
