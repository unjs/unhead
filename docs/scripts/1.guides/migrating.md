---
title: "Migration Guide"
description: "Move from other script loaders to Unhead Scripts"
---

Move from other script loaders to Unhead Scripts safely.

## From Script Tags

```html
<!-- Before -->
<script async src="analytics.js"></script>
<script>
window.analytics = window.analytics || []
analytics.push(['init'])
</script>

<!-- After -->
```ts
const analytics = useScript('analytics.js', {
  beforeInit() {
    window.analytics = window.analytics || []
    window.analytics.push(['init'])
  }
})
```

## From Vue-Meta

```ts
// Before
metaInfo: {
  script: [
    { src: 'widget.js', async: true },
    { innerHTML: 'widget.init()' }
  ]
}

// After
useScript('widget.js', {
  beforeInit() {
    widget.init()
  }
})
```

## From React Helmet

```tsx
// Before
<Helmet>
  <script src="chat.js" />
  <script>
    window.$crisp = []
  </script>
</Helmet>

// After
useScript('chat.js', {
  beforeInit() {
    window.$crisp = []
  }
})
```

## Common Issues

### Script Order

```ts
// Before: Scripts load in order
<script src="dep.js" />
<script src="main.js" />

// After: Use promises
const dep = useScript('dep.js')
const main = useScript('main.js', {
  trigger: dep.load()
})
```

### Global Variables

```ts
// Before: Variables available globally
<script>var CONFIG = { api: '/api' }</script>

// After: Pass through beforeInit
useScript('app.js', {
  beforeInit() {
    window.CONFIG = { api: '/api' }
  }
})
```

## External Resources

- [Script Loading Patterns](https://www.patterns.dev/vanilla/loading-javascript)
- [Vue Meta Migration](https://vue-meta.nuxtjs.org/migrating/from-v1)
- [React Helmet Alternative](https://github.com/nfl/react-helmet#migrate)

## Next Steps

- [Test Scripts →](/unhead/scripts/testing-scripts)
- [Monitor Performance →](/unhead/scripts/performance-monitoring)
- [Handle Errors →](/unhead/scripts/load-failures)
