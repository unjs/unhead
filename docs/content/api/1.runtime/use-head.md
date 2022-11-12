---
title: useHead
description: How to use the useHead composable.
---

**Type:** 

```ts
function useHead<T extends MergeHead>
    (input: UseHeadInput<T>, options: HeadEntryOptions = {}) : void
```

The `useHead` composable is the primary way to manage the head of the document at runtime.

Internally this uses the [getActiveHead](/api/core/get-active-head) to access the unhead instance, allowing you
to use this function without referencing your head explicitly.

## Example

Add a page title and a meta description.

```ts
useHead({
  title: 'My Page',
  meta: [
    {
      name: 'description',
      content: 'My page description',
    },
  ],
})
```


## HeadEntryOptions

The second argument to `useHead` is the `HeadEntryOptions`.

```ts
export interface HeadEntryOptions {
  mode?: RuntimeMode
}
```

This lets you specify which mode the head should be applied in.

By default, entries are rendered in both server and client. If you'd like to only use a specific mode 
you can set the `mode` option to either `server` or `client`.

If you intend to server render tags you should instead opt for the `useServerHead` composable.
