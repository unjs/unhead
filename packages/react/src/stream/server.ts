import type { Writable } from 'node:stream'
import type { ReactNode } from 'react'
import type { CreateStreamableServerHeadOptions, PreparedTemplate, StreamableHeadContext } from 'unhead/stream/server'
import type { ResolvableHead } from 'unhead/types'
import type { UniversalUnheadProviderProps } from '../context'
import { PassThrough } from 'node:stream'
import { createElement, useContext } from 'react'
import {
  createStreamableHead as createCoreStreamableHead,
  prepareStreamingTemplate,
  renderSSRHeadSuspenseChunk,
  renderStreamEnd,
} from 'unhead/stream/server'
import { UnheadContext } from '../context'

export type UnheadProviderProps = UniversalUnheadProviderProps

export function UnheadProvider({ value, children }: UnheadProviderProps): ReactNode {
  return createElement(UnheadContext.Provider, { value }, children)
}

/**
 * Streaming head component for React.
 *
 * Return it from the same component that calls `useHead`, ahead of that
 * component's own markup:
 *
 * ```tsx
 * return <><HeadStream />{jsx}</>
 * ```
 *
 * It must re-render in lockstep with that component. As a sibling of a
 * suspending component, React evaluates it once before the suspension is
 * detected, and does not evaluate it again on the replay. This call clears the
 * pending entries, so they reach the page as neither markup nor a patch.
 *
 * The bundler plugin applies the wrapping form for you.
 */
export function HeadStream(): ReactNode {
  const head = useContext(UnheadContext)
  if (!head) {
    throw new Error('HeadStream: head context not found')
  }

  const update = renderSSRHeadSuspenseChunk(head)
  // Always render script element for hydration consistency with client
  return createElement('script', {
    suppressHydrationWarning: true,
    dangerouslySetInnerHTML: update ? { __html: update } : undefined,
  })
}

/**
 * A pipe function from React's renderToPipeableStream
 */
type ReactPipeFunction = (writable: Writable) => void

/**
 * React-specific context returned by createStreamableHead.
 * Extends core StreamableHeadContext with React's wrap helper.
 */
export interface ReactStreamableHeadContext<T = ResolvableHead>
  extends Pick<StreamableHeadContext<T>, 'head' | 'onShellReady'> {
  /**
   * Wrap React's pipe function to handle head injection automatically
   * @param pipe - The pipe function from renderToPipeableStream
   * @param template - The HTML template (from Vite's transformIndexHtml), or a `prepareTemplate()` result
   * @returns A new pipe function that handles shell rendering
   */
  wrap: (pipe: ReactPipeFunction, template: string | PreparedTemplate) => (writable: Writable) => void
}

/**
 * Creates a head instance configured for React streaming SSR.
 *
 * Returns a context with:
 * - `head`: The Unhead instance for UnheadProvider
 * - `onShellReady`: Callback to pass to renderToPipeableStream
 * - `wrap`: Wraps React's pipe to handle head injection
 *
 * @example
 * ```tsx
 * const { head, onShellReady, wrap } = createStreamableHead()
 *
 * const { pipe } = renderToPipeableStream(
 *   <UnheadProvider value={head}><App /></UnheadProvider>,
 *   { onShellReady }
 * )
 *
 * return { pipe: wrap(pipe, template) }
 * ```
 */
export function createStreamableHead<T = ResolvableHead>(
  options: CreateStreamableServerHeadOptions = {},
): ReactStreamableHeadContext<T> {
  const { head, onShellReady, shellReady } = createCoreStreamableHead<T>(options)

  return {
    head,
    onShellReady,
    wrap: (pipe: ReactPipeFunction, template: string | PreparedTemplate) => {
      // This wrapper always writes `renderStreamEnd`, so body-bound tags need
      // no patch copy. A caller driving `head` by hand keeps the fallback.
      ;(head._stream ||= {}).writesMarkup = true
      return (writable: Writable) => {
        shellReady.then(async () => {
          try {
            const parts = await prepareStreamingTemplate(head, template)
            writable.write(parts.shell)

            const passthrough = new PassThrough()

            passthrough.on('data', chunk => writable.write(chunk))
            passthrough.on('end', () => {
              // Runs after the enclosing catch has gone, so it owns its own failure.
              try {
                writable.write(renderStreamEnd(head, parts))
                writable.end()
              }
              catch (err) {
                writable.destroy(err instanceof Error ? err : new Error(String(err)))
              }
            })
            passthrough.on('error', (err) => {
              writable.destroy(err)
            })

            pipe(passthrough)
          }
          catch (err) {
            writable.destroy(err instanceof Error ? err : new Error(String(err)))
          }
        })
      }
    },
  }
}

// Export streaming-specific items from unhead (except createStreamableHead which we override)
export {
  type BaseStreamableHeadContext,
  type CreateStreamableServerHeadOptions,
  inspectStreamedTags,
  type PreparedTemplate,
  prepareStreamingTemplate,
  prepareTemplate,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  renderStreamEnd,
  renderStreamMarkup,
  type StreamableHeadContext,
  type StreamedTagsReport,
  type StreamingTemplateParts,
  type WebStreamableHeadContext,
  wrapStream,
} from 'unhead/stream/server'
