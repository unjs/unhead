---
title: 'Wrapping Composables'
description: 'Get started with Unhead by installing the dependency to your project.'
---

## Introduction

When we create an Unhead instance, there is no context management built-in. What we mean by this, is we're not registering the instance to a global context, meaning
you need to pass the instance.

This is by design, as Unhead is designed as frameworks handle this context management for you. However, if you're using Unhead in a non-framework environment, you may want to wrap the composables to manage the context.

The installation guide shows how to attach the head instance to the global window object:

```ts
import { useHead } from 'unhead'

// ❌ Not recommended
useHead(window.__UNHEAD__, {
  title: 'My Page',
})
```

However, this isn't ideal as we can no longer load multiple instances of our app on the same page and
we need to manage the head instance ourselves.

## Creating a context

Each app or framework has its own way of managing context. If you're looking to create your own you should look
at [unctx](https://github.com/unjs/unctx) for a simple context management solution

```ts [my-app-context.ts]
import { createContext } from 'unctx'

const appCtx = createContext()

export const useMyApp = appCtx.use
```

```ts [main.ts]
import { useMyApp } from './my-app-context'

// attach unhead to the app context
useMyApp().head = createHead()
```

## Wrapping composables

Now that we have an app context, we can wrap the composables to use the context.

```ts [head.ts]
import { useHead as baseUseHead } from 'unhead'
import { useMyApp } from './my-app-context'

export function useHead<T extends Unhead<any>>(unhead: T, input: Parameters<T['push']>[0], options?: HeadEntryOptions): ReturnType<T['push']> {
  const { head } = useMyApp()
  return baseUseHead(head, input)
}
```

```ts
import { useHead } from './head'

// ✅ Recommended
useHead({
  title: 'My Page',
})
```
