---
title: Migrating from React Helmet to Unhead
description: A practical guide to replace React Helmet with Unhead in your React applications.
navigation:
  title: 'Migrate from React Helmet'
---

## Introduction

[React Helmet](https://github.com/nfl/react-helmet) was the go-to solution for managing `<head>` tags in React applications for years. However, its last major release was in 2020 and the project is now in maintenance mode.

Outside regular maintenance [Unhead](https://unhead.unjs.io) offers a modern alternative with:
- Full TypeScript safety
- DOM event handlers
- Advanced DOM patching algorithm built for reactive frameworks
- Ecosystem of extras: `useSchemaOrg()`{lang="ts"}, `useScript()`{lang="ts"}, and more
- Intelligent tag sorting for improved performance

## Comparison

React Helmet uses a `<Helmet>` component to manage head tags. Unhead provides a `<Head>` component, offering a similar
API.

```tsx [React Helmet]
import { Helmet } from 'react-helmet'

function App() {
  return (
    <Helmet>
      <title>My Site</title>
      <meta name="description" content="Description" />
    </Helmet>
  )
}
```

```tsx [Unhead]
import { Head } from '@unhead/react'

function App() {
  return (
    <Head>
      <title>My Site</title>
      <meta name="description" content="Description" />
    </Head>
  )
}
```

## Migration Steps

### 1. Update Dependencies

Remove React Helmet and install Unhead:

```bash
npm remove react-helmet
npm install @unhead/react@next
```

### 2. Add the Provider

Unlike React Helmet, Unhead uses a provider, providing a safer context for managing head tags.

Add it to your app's entry point:

```tsx [src/entry-client.tsx]
import { createHead, UnheadProvider } from '@unhead/react/client'

const head = createHead()

function App() {
  return (
    <UnheadProvider head={head}>
      <YourApp />
    </UnheadProvider>
  )
}
```

### 3. Replace Components

Replace all instances of `<Helmet>` with `<Head>`.

```diff
-import { Helmet } from 'react-helmet'
+import { Head } from '@unhead/react'

function Title() {
return (
  <div>
-    <Helmet title-template="%s | My Site" />
-      <title>Hello World</title>
-    </Helmet>
+    <Head title-template="%s | My Site">
+      <title>Hello World</title>
+    </Head>
    <h1>Hello World</h1>
  </div>
  )
}
```

There are some nuanced differences to be aware of:
- `defaultTitle` is not supported
- `onChangeClientState` is not supported

### 4. Update Server Rendering

If you're using SSR, update your server code:

```tsx [src/entry-server.tsx]
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App'
import { createHead, UnheadProvider } from '@unhead/react/server'

export function render(_url: string) {
  const head = createHead()
  const html = renderToString(
    <StrictMode>
      <UnheadProvider value={head}>
        <App />
      </UnheadProvider>
    </StrictMode>,
  )
  return { html, head }
}
```

### 5. That's It!

You've successfully migrated from React Helmet to Unhead.

Check out some of the Unhead concepts:
- [Tag Placement](/docs/guides/positions)
- [DOM Event Handling](/docs/guides/dom-event-handling)
- [Handling Duplicates](/docs/guides/handling-duplicates)

## Need Help?

If you run into issues during migration:
- File an issue on [GitHub](https://github.com/unjs/unhead)
- Join our [Discord community](https://discord.gg/unjs)
