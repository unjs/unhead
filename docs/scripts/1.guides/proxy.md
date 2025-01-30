---
title: "Script Proxy API"
description: "Use third-party script functions before they load"
---

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

## What to Proxy

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

## Real Examples

### Google Analytics

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

## External Resources

- [JavaScript Proxy Objects](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)
- [Command Pattern](https://www.patterns.dev/vanilla/command-pattern)
- [Queue Theory](https://web.dev/articles/network-connections)

## Next Steps

- [Respect Privacy →](/unhead/scripts/respecting-privacy)
- [Load Triggers →](/unhead/scripts/load-triggers)
- [Handle Errors →](/unhead/scripts/load-failures)
