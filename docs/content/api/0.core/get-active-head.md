---
title: getActiveHead
description: Access your Unhead instance wherever you are.
---

**Type:**

```ts
export const getActiveHead = <T extends Unhead> () => activeHead as T
```

Get access to your head instance.

This is used internally with the composable functions like `useHead`.

## Example

```ts
import { getActiveHead } from 'unhead'

getActiveHead().push({ title: 'Hello World' })
```
