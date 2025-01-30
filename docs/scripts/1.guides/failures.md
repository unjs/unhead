---
title: "Handle Script Loading Failures"
description: "Gracefully handle third-party script errors and timeouts"
---

# Handle Script Loading Failures

Scripts fail to load. Handle it gracefully.

## Quick Error Handling

```ts
const script = useScript('widget.js')
  .catch(error => {
    console.error('Widget failed to load:', error)
    // Show fallback UI
  })
```

## Common Failures

### Timeout

```ts
function loadWithTimeout(src: string, timeout = 3000) {
  return useScript(src, {
    trigger: new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Script load timeout'))
      }, timeout)
      
      resolve()
      clearTimeout(timer)
    })
  })
}
```

### Network Error

```ts
const analytics = useScript('analytics.js')
  .catch(error => {
    if (error.name === 'NetworkError') {
      // Queue events for retry
      return {
        event: (name: string) => {
          queueEvent(name)
        }
      }
    }
    throw error
  })
```

### Content Blockers

```ts
const script = useScript('tracker.js')
  .catch(error => {
    if (error.name === 'SecurityError') {
      // Ad blocker or privacy tool blocked script
      disableTracking()
    }
  })
```

## Check Script Status

```ts
const script = useScript('widget.js')

// Reactive in Vue, normal value in vanilla
console.log(script.status)
// 'awaitingLoad' | 'loading' | 'loaded' | 'error'
```

## External Resources

- [Script Error Logging](https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onerror)
- [Content Blocking Detection](https://webkit.org/blog/8943/privacy-preserving-ad-click-attribution-for-the-web/)
- [Network Error Handling](https://developer.mozilla.org/en-US/docs/Web/API/NetworkError)

## Next Steps

- [Use Proxy API →](/unhead/scripts/proxy-api)
- [Respect Privacy →](/unhead/scripts/respecting-privacy)
- [Load Triggers →](/unhead/scripts/load-triggers)
