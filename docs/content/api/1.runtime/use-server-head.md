---
title: useServerHead
description: Using the useServerHead for minimal client-side bundles.
---

# useServerHead

**Type:**

```ts
function useServerHead<T extends MergeHead>
    (input: UseHeadInput<T>, options: HeadEntryOptions = {}) : void
```

The `useServerHead` composable lets you add tags for the server only.

This is the same as doing `useHead(input, { mode: 'server' })` but allows for better code splitting.

## Example

Add a page title and a meta description.

```ts
useServerHead({
  title: 'My Page',
  meta: [
    {
      name: 'description',
      content: 'My page description',
    },
  ],
})
```
