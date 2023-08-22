---
title: debouncedRenderDOMHead
description: Render the Unhead tags to the DOM using a debounce function.
---

**Type:**

```ts
function debouncedRenderDOMHead<T extends Unhead>(head: T, options: DebouncedRenderDomHeadOptions = {}): Promise<void>
```

```ts
interface DebouncedRenderDomHeadOptions {
  /**
   * Document to use for rendering. Allows stubbing for testing.
   */
  document?: Document
  /**
   * Specify a custom delay function for delaying the render.
   */
  delayFn?: (fn: () => void) => void
}
```

Render the Unhead tags to the DOM using a debounce function.

This is useful for when you want to render the tags to the DOM, but don't want to do it immediately.

## Example

```ts
import { createHead } from 'unhead'
import { debouncedRenderDOMHead } from '@unhead/dom'

const head = createHead()

head.push({ title: 'Hello World ' })

debouncedRenderDOMHead(head, {
  // wait 1 second before rendering
  delayFn: fn => setTimeout(fn, 1000)
})
```
