---
title: push
description: Push an entry to Unhead.
---

# push

**Type:**

```ts
(entry: Input, options?: HeadEntryOptions) => ActiveHeadEntry<Input>
```

Pushes an entry to the active head.

This is a lower-level function that is used internally with composable functions like `useHead`.

## Example

```ts
import { createHead } from 'unhead'

const head = createHead()

head.push({
  title: 'Hello World'
})
```

## Using the Entry API

The `push` function will not reactive to your data changes. You will need to use the returned entry API to handle lifecycle.

```ts
import { createHead } from 'unhead'

const head = createHead()

// push initial
const input = { title: 'Hello World' }
const entry = head.push(input)

// push changes
input.title = 'Hello World 2'
entry.patch(entry)

// remove entry
entry.dispose()
```

