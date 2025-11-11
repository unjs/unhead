# React Streaming SSR Example with Unhead

This example demonstrates how to use `@unhead/react` with React's streaming SSR (`renderToPipeableStream`) to get the benefits of streaming while properly managing head tags.

## Features

- ✅ **Streaming SSR** using `renderToPipeableStream`
- ✅ **Head tag injection** during streaming
- ✅ **Suspense support** with proper buffering
- ✅ **Body tag injection** at stream end
- ✅ **Full Unhead features** (ordering, positioning, schema.org, etc.)

## How It Works

The streaming implementation uses a similar approach to Vue's streaming example:

1. **Render Setup**: Use `renderToPipeableStream` to create a React stream
2. **Buffer Initial Chunks**: Buffer the first few chunks to detect Suspense boundaries
3. **Inject Head Tags**: When ready to flush, inject head tags into the first chunk
4. **Stream Remaining Content**: Stream subsequent chunks directly to the client
5. **Inject Body Tags**: Add body tags at the end of the stream

## Key Files

### `src/entry-server.tsx`

Creates a React stream using `renderToPipeableStream`:

```tsx
import { renderToPipeableStream } from 'react-dom/server'
import { PassThrough } from 'node:stream'
import { createHead, UnheadProvider } from '@unhead/react/server'

export function render(_url: string) {
  const head = createHead()
  const stream = new PassThrough()

  const { pipe } = renderToPipeableStream(
    <UnheadProvider value={head}>
      <App />
    </UnheadProvider>,
    {
      onShellReady() {
        pipe(stream)
      },
    }
  )

  return { stream, head }
}
```

### `server.js`

Uses `renderReactStream` to handle streaming with head injection:

```js
import { renderReactStream } from '@unhead/react/server'

const { stream: reactStream, head } = render(url)
const [htmlStart, htmlEnd] = template.split('<!--app-html-->')

await renderReactStream({
  res,
  reactStream,
  htmlStart,
  htmlEnd,
  head,
})
```

## Streaming Utility API

The `renderReactStream` function handles all the complexity:

```ts
interface RenderReactStreamOptions {
  res: Response                 // Express response object
  reactStream: Readable         // React stream from renderToPipeableStream
  htmlStart: string             // HTML before app placeholder
  htmlEnd: string               // HTML after app placeholder
  head: Unhead                  // Unhead instance
  flushTimeout?: number         // Buffer timeout (default: 3ms)
}
```

## Benefits Over React 19 Native Metadata

While React 19 has native metadata hoisting, this streaming approach provides:

- **Advanced tag ordering** with `tagPriority` and `tagPosition`
- **Body tag positioning** (bodyOpen, bodyClose)
- **Script lifecycle management** with `useScript`
- **Schema.org support** via `@unhead/schema-org`
- **Custom deduplication** logic
- **DOM event handlers** on tags

## Running the Example

```bash
# Development
npm run dev

# Production build
npm run build
npm run preview
```

## Comparison with Non-Streaming Approach

| Feature | Non-Streaming (`renderToString`) | Streaming (`renderToPipeableStream`) |
|---------|----------------------------------|--------------------------------------|
| TTFB (Time to First Byte) | Slower - waits for full render | Faster - streams immediately |
| Suspense Support | Limited | Full support |
| Head Tag Management | ✅ All features | ✅ All features |
| Bundle Size | Same | Same |
| SEO | ✅ | ✅ |

## Learn More

- [React `renderToPipeableStream` docs](https://react.dev/reference/react-dom/server/renderToPipeableStream)
- [Unhead React docs](https://unhead.unjs.io/setup/react)
- [Streaming SSR in React 18+](https://react.dev/reference/react-dom/server)
