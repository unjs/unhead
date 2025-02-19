---
title: "Monitor Script Performance"
description: "Track and improve third-party script performance"
---

Measure the real impact of your third-party scripts.

## Basic Monitoring

```ts
const script = useScript('widget.js', {
  beforeInit() {
    performance.mark('widget-start')
  },
  onLoaded() {
    performance.mark('widget-end')
    performance.measure('widget-load', 'widget-start', 'widget-end')
  }
})
```

## Real User Monitoring

```ts
useScript('analytics.js', {
  onLoaded() {
    const entry = performance.getEntriesByName('script-load')[0]

    sendToAnalytics({
      name: 'script_load',
      duration: entry.duration,
      size: entry.transferSize,
      cache: entry.transferSize === 0
    })
  }
})
```

## Performance Budget

```ts
const MAX_LOAD_TIME = 2000 // 2 seconds

useScript('heavy.js', {
  onLoaded() {
    const timing = performance.now()
    if (timing > MAX_LOAD_TIME) {
      console.warn(`Script load exceeded budget: ${timing}ms`)
    }
  }
})
```

## Tracking Script Impact

Use the Performance API:

```ts
// Before script load
const beforeFCP = performance.getEntriesByType('paint')[0]?.startTime

useScript('widget.js', {
  onLoaded() {
    const afterFCP = performance.getEntriesByType('paint')[0]?.startTime
    console.log(`FCP Impact: ${afterFCP - beforeFCP}ms`)
  }
})
```

## Common Problems

- First Paint +300ms
- First Input Delay +200ms
- Time to Interactive +2s

## External Resources

- [Performance API Guide](https://web.dev/articles/custom-metrics)
- [RUM vs Synthetic Monitoring](https://web.dev/articles/vitals-measurement-getting-started)
- [Core Web Vitals](https://web.dev/articles/vitals)

## Next Steps

- [Test Scripts →](/unhead/scripts/testing-scripts)
- [Handle Errors →](/unhead/scripts/load-failures)
- [Load Triggers →](/unhead/scripts/load-triggers)
