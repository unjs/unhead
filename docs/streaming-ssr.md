# Streaming SSR with Unhead (Experimental)

> ⚠️ **Experimental Feature**: The streaming SSR API is experimental and may change in future versions.

> 🎯 **Framework Support**: Currently only supports **Vue 3** and native Node.js streams. React and Solid.js support coming soon.

Unhead provides experimental support for streaming SSR, allowing you to update head tags dynamically as your application streams to the client. This feature requires integration with framework-specific streaming renderers that support chunking control.

## Overview

Streaming SSR allows you to send HTML to the browser as soon as it's ready, rather than waiting for the entire page to render. With Unhead's streaming support, you can:

- Update the document title as components load
- Add meta tags progressively
- Modify HTML/body attributes during streaming
- Deduplicate tags to prevent conflicts

## Basic Usage

### Vue 3

```typescript
import { createHead, streamAppWithUnhead } from '@unhead/vue/server'
import { renderToNodeStream } from 'vue/server-renderer'

// Create a head instance per request
const head = createHead()

// Your Vue app stream
const appStream = renderToNodeStream(app)

// Stream with head management
const htmlStart = '<!DOCTYPE html><html><head></head><body>'
const htmlEnd = '</body></html>'

for await (const chunk of streamAppWithUnhead(appStream, htmlStart, htmlEnd, head)) {
  res.write(chunk)
}
res.end()
```

### React / Other Frameworks

```typescript
// Use your framework's streaming renderer
import { renderToPipeableStream } from 'react-dom/server'
import { createHead, streamAppWithUnhead } from 'unhead/server'

const head = createHead()
// ... setup and streaming logic
```

## Bot Detection Example

A common pattern is to disable streaming for bots (search engines, social media crawlers) to ensure they receive complete metadata immediately.

```typescript
import { createHead, renderSSRHead, streamAppWithUnhead } from '@unhead/vue/server'
import { isbot } from 'isbot'
import { renderToNodeStream, renderToString } from 'vue/server-renderer'

export async function handleRequest(req, res) {
  // Create a fresh head instance for each request
  const head = createHead()

  // Set up your app with the head instance
  const app = createApp({
    head,
    // ... other setup
  })

  // Detect if the request is from a bot
  const userAgent = req.headers['user-agent'] || ''
  const isBot = isbot(userAgent)

  // Choose rendering strategy based on bot detection
  if (isBot) {
    // For bots: Use traditional SSR for complete HTML
    await renderCompleteHTML(app, head, res)
  }
  else {
    // For users: Use streaming for better performance
    await renderStreamingHTML(app, head, res)
  }
}

async function renderCompleteHTML(app, head, res) {
  // Render the complete app
  const appHTML = await renderToString(app)

  // Get the complete head
  const { headTags, bodyTags, htmlAttrs, bodyAttrs } = await renderSSRHead(head)

  // Send complete HTML
  const html = `
<!DOCTYPE html>
<html ${htmlAttrs}>
<head>
  ${headTags}
</head>
<body ${bodyAttrs}>
  ${appHTML}
  ${bodyTags}
</body>
</html>`

  res.status(200).type('html').send(html)
}

async function renderStreamingHTML(app, head, res) {
  const appStream = renderToNodeStream(app)

  const htmlStart = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body>`

  const htmlEnd = `</body></html>`

  res.status(200).type('html')

  // Stream the response
  for await (const chunk of streamAppWithUnhead(appStream, htmlStart, htmlEnd, head)) {
    res.write(chunk)
  }
  res.end()
}
```

## Vue 3 with Suspense

Here's how to use streaming with Vue 3's Suspense feature:

### 1. Create a HeadStream Component

```vue
<!-- components/HeadStream.vue -->
<script lang="ts">
import { h } from 'vue'

export default {
  setup() {
    return () => {
      return h('script', {
        'data-unhead-stream': true,
        'innerHTML': '<!--[unhead-stream]-->',
      })
    }
  }
}
</script>
```

### 2. Use in Async Components

```vue
<!-- components/ProductDetails.vue -->
<script setup>
import HeadStream from './HeadStream.vue'

// Simulate async data loading
const product = await fetchProduct()

// Update head when component loads
useServerHead({
  title: product.name,
  meta: [
    { name: 'description', content: product.description },
    { property: 'og:title', content: product.name },
    { property: 'og:image', content: product.image }
  ]
})
</script>

<template>
  <div>
    <h1>{{ product.name }}</h1>
    <p>{{ product.description }}</p>
    <!-- Stream marker for head updates -->
    <HeadStream />
  </div>
</template>
```

### 3. App with Suspense

```vue
<!-- App.vue -->
<script setup>
import ProductDetails from './components/ProductDetails.vue'

// Initial head data
useHead({
  title: 'Loading...',
  htmlAttrs: { lang: 'en' }
})
</script>

<template>
  <div>
    <header>My Store</header>

    <Suspense>
      <template #default>
        <ProductDetails />
      </template>
      <template #fallback>
        <div>Loading product details...</div>
      </template>
    </Suspense>
  </div>
</template>
```

## How It Works

1. **Initial Chunk**: When the first chunk is processed, Unhead injects the initial head tags into the `<head>` section
2. **Stream Markers**: Components can include `<!--[unhead-stream]-->` markers that are replaced with JavaScript to update head tags
3. **Progressive Updates**: As components resolve, their head updates are applied client-side
4. **Deduplication**: Tags are deduplicated to prevent conflicts when multiple components update the same tags

## Best Practices

### 1. Create Head Instance Per Request

Always create a new head instance for each request to avoid state contamination:

```typescript
// ✅ Good
app.get('/', (req, res) => {
  const head = createHead()
  // ... use head for this request
})

// ❌ Bad - shared instance
const head = createHead()
app.get('/', (req, res) => {
  // ... head is shared across requests!
})
```

### 2. Consider SEO Impact

While streaming improves user experience, consider these SEO factors:

- Bots may not execute JavaScript for head updates
- Initial head tags should contain critical metadata
- Use bot detection to serve complete HTML when needed

### 3. Error Handling

Wrap streaming in try-catch blocks:

```typescript
try {
  for await (const chunk of streamAppWithUnhead(appStream, htmlStart, htmlEnd, head)) {
    if (res.closed)
      break
    res.write(chunk)
  }
}
catch (error) {
  console.error('Streaming error:', error)
  // Handle error appropriately
}
```

### 4. Performance Monitoring

Monitor streaming performance:

```typescript
const startTime = Date.now()
let chunkCount = 0

for await (const chunk of streamAppWithUnhead(appStream, htmlStart, htmlEnd, head)) {
  chunkCount++
  res.write(chunk)
}

console.log(`Streamed ${chunkCount} chunks in ${Date.now() - startTime}ms`)
```

## Limitations

- Body position scripts (`bodyOpen`, `bodyClose`) only appear in final output
- Stream markers split across chunks won't be processed
- Requires client-side JavaScript for head updates

## API Reference

### `streamAppWithUnhead(appStream, htmlStart, htmlEnd, head)`

Streams an SSR application with dynamic head management.

**Parameters:**
- `appStream`: AsyncIterable<Uint8Array | string> - The app's render stream
- `htmlStart`: string - Initial HTML up to opening body tag
- `htmlEnd`: string - Closing HTML from closing body tag
- `head`: Unhead - The head instance for this request

**Returns:** AsyncGenerator<string> - Processed HTML chunks

### `renderSSRStreamComponents(head, html)`

Processes a single HTML chunk for head updates.

**Parameters:**
- `head`: Unhead - The head instance
- `html`: string - HTML chunk to process

**Returns:** Promise<string> - Processed HTML

## Examples

- [Vue 3 Streaming SSR Example](/examples/vite-ssr-vue-streaming)
- [React 18 Streaming Example](/examples/vite-ssr-react-streaming)

## Future Improvements

- Better error recovery strategies
- Stream compression support
- More granular control over update timing
- WebSocket support for head updates
