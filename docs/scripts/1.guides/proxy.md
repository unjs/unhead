---
title: "Script Proxy API"
description: "Use third-party script functions before they load"
---

## Introduction

You may wonder how the `useScript()`{lang="ts"} composable can return SSR safe functions that can be called before the script is loaded.

```ts
const { proxy } = useScript('/script.js')
// just works as you'd expect - magic?
proxy.gtag('event', 'page_view')
```

The `gtag` function call is a proxy that queues the function to be called when the script is loaded. If
the script never loads then the function is never called.

This has several benefits:

- SSR safe
- Won't break your site if the script never loads (blocked by adblockers)
- Allows you to load the script whenever you want without worrying about the order of the script and function calls

But it also has some downsides:

- It only works for functions where you don't need the return value. You can await the function call to get the return value, but this will block the rendering of the page.
- It can be confusing to debug if you're not aware of how it works.

It's recommended to await the script load if you want to access the script's API directly.

```ts
const { onLoaded } = useScript('/script.js')
// use the script instance directly, not proxied
onLoaded(({ gtag }) => {
  gtag('event', 'page_view')
})
```

Use script functions before they load. All calls queue until the script is ready.

## Basic Usage

  ```ts
const analytics = useScript('analytics.js', {
  use() {
    return window.analytics
  }
})

// Works before script loads
analytics.proxy.trackEvent('page_view')
```

### Good Use Cases

```ts
// Fire and forget events
analytics.proxy.event('click')

// State updates
chat.proxy.setUser(userId)

// One-way commands
player.proxy.play()
```

### Bad Use Cases

  ```ts
// DON'T proxy getters
const id = script.proxy.userId // Always undefined

// DON'T proxy return values
const data = script.proxy.getData() // Always void

// DON'T proxy promises
await script.proxy.fetch() // Never resolves
```

### Example: Google Analytics

  ```ts
const ga = useScript('gtag.js', {
  use() {
    return window.gtag
  }
})

// Queues until script loads
ga.proxy.event('timing_complete', {
  name: 'load',
  value: performance.now()
})
```

### Crisp Chat

  ```ts
const crisp = useScript('crisp.js', {
  use() {
    return window.$crisp
  }
})

// Safe to call anytime
crisp.proxy.push(['do', 'chat:open'])
```
