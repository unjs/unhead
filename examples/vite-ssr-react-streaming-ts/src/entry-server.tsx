import { StrictMode } from 'react'
import {
  type RenderToPipeableStreamOptions,
  renderToPipeableStream,
} from 'react-dom/server'
import App from './App'
import { createHead, UnheadProvider } from '@unhead/react/server'

/**
 * Enhanced render function with improved streaming support
 *
 * This function sets up streaming rendering for React components with:
 * - Proper bootstrapping for React hydration
 * - Support for progressive content streaming
 * - Handling of streaming options like shell ready/error events
 */
export function render(_url: string, options?: RenderToPipeableStreamOptions) {
  const head = createHead()

  // Create the stream with detailed options
  const stream = renderToPipeableStream(
    <StrictMode>
      <UnheadProvider head={head}>
        <App />
      </UnheadProvider>
    </StrictMode>,
    {
      ...options,
      // We can add more streaming-specific options here
      bootstrapModules: ['/src/entry-client.tsx'],
    },
  )

  return { stream, head }
}
