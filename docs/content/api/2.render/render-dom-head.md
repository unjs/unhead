---
title: renderDOMHead
description: Render the head to the DOM.
---

# renderDOMHead

**Type:**

```ts
function renderDOMHead<T extends Unhead<any>>(head: T, options: RenderDomHeadOptions = {}): void
```

```ts
interface RenderDomHeadOptions {
  /**
   * Document to use for rendering. Allows stubbing for testing.
   */
  document?: Document
}
```

Render the head to the DOM.

This is useful for when you want to render the tags to the DOM immediately.

## Example

```ts
import { createHead } from 'unhead'
import { renderDOMHead } from '@unhead/dom'

const head = createHead()

head.push({ title: 'Hello World ' })

renderDOMHead(head)
```
