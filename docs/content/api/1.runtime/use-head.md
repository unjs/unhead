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


## Augmenting Input

If you'd like to extend the type of the input, you can provide a generic type to the `useHead` composable.

This acts as a merge for the in-built schema, allowing you to add type-hints or new tag attributes.

For example, let's improve the DX of our `link` elements by providing type-hints for some common paths.

```ts
import { MergeHead } from '@unhead/vue'

interface UseMyLinkHead extends MergeHead {
  link: {
    href: 'add-this-link' | 'or-this-one'
  }
}

export const useMyLinkHead = 
  (input: Head<UseMyLinkHead>) => useHead<UseMyLinkHead>(input)
```

Now when someone uses your composable, they will get type-hints for the `href` attribute.

```ts
useMyLinkHead({
  link: [
    {
      // user will be prompted with "add-this-link", "or-this-one" 
      href: '',
    }
  ]
})
```
