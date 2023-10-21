---
title: renderSSRHead
description: Render Unhead to a string that be can be server side rendered.
---

**Type:**

```ts
function renderSSRHead<T extends {}>(head: Unhead<T>): SSRHeadPayload
```

```ts
export interface SSRHeadPayload {
  headTags: string
  bodyTags: string
  bodyTagsOpen: string
  htmlAttrs: string
  bodyAttrs: string
}
```

Render Unhead to a string that can be server side rendered.

This is useful for when you want to render the tags to a string that can be used in SSR.

## Example

```ts
import { createHead } from 'unhead'
import { renderSSRHead } from '@unhead/ssr'

const head = createHead()

head.push({ title: 'Hello World ' })

const { headTags, bodyTags, bodyTagsOpen, htmlAttrs, bodyAttrs } = renderSSRHead(head)

return `
<!DOCTYPE html>
<html ${htmlAttrs}>
  <head>
    ${headTags}
  </head>
  <body ${bodyAttrs}>
    ${bodyTagsOpen}
    <div id="app"></div>
    ${bodyTags}
  </body>
</html>
`
