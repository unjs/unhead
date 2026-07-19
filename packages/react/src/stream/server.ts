import type { Writable } from 'node:stream'
import type { ReactElement, ReactNode } from 'react'
import type { CreateStreamableServerHeadOptions, PreparedTemplate, StreamableHeadContext } from 'unhead/stream/server'
import type { CompatibleHead, ResolvableHead, Unhead, UseHeadInput } from 'unhead/types'
import { PassThrough } from 'node:stream'
import { createElement, useContext } from 'react'
import {
  createStreamableHead as createCoreStreamableHead,
  prepareStreamingTemplate,
  renderSSRHeadSuspenseChunk,
} from 'unhead/stream/server'
import { UnheadContext } from '../context'

export interface UnheadProviderProps<I = UseHeadInput, RenderResult = unknown> {
  value: CompatibleHead<I, ResolvableHead, RenderResult>
  children: ReactNode
}

export function UnheadProvider<I = UseHeadInput, RenderResult = unknown>({ value, children }: UnheadProviderProps<I, RenderResult>): ReactElement {
  return createElement(UnheadContext.Provider, { value: value as unknown as Unhead }, children)
}

/**
 * Streaming head component for React.
 * Place inside Suspense boundaries after async components that use useHead.
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

type CreateStreamableHeadArgs<Input> = ResolvableHead extends Input
  ? [options?: CreateStreamableServerHeadOptions<Input>]
  : [options: CreateStreamableServerHeadOptions<Input> & { disableDefaults: true }]

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
export function createStreamableHead(options?: CreateStreamableServerHeadOptions<ResolvableHead>): ReactStreamableHeadContext<ResolvableHead>
export function createStreamableHead<T>(options: CreateStreamableServerHeadOptions<T> & { disableDefaults: true }): ReactStreamableHeadContext<T>
export function createStreamableHead<T>(options: CreateStreamableServerHeadOptions<T>): ReactStreamableHeadContext<T | ResolvableHead>
export function createStreamableHead<T = ResolvableHead>(...args: CreateStreamableHeadArgs<T>): ReactStreamableHeadContext<T>
export function createStreamableHead<T = ResolvableHead>(
  options: CreateStreamableServerHeadOptions<T> = {},
): ReactStreamableHeadContext<T> {
  const { head, onShellReady, shellReady } = createCoreStreamableHead<T>(options as CreateStreamableServerHeadOptions<T> & { disableDefaults: true })

  return {
    head,
    onShellReady,
    wrap: (pipe: ReactPipeFunction, template: string | PreparedTemplate) => {
      return (writable: Writable) => {
        shellReady.then(async () => {
          try {
            const { shell, end } = await prepareStreamingTemplate(head, template)
            writable.write(shell)

            const passthrough = new PassThrough()

            passthrough.on('data', chunk => writable.write(chunk))
            passthrough.on('end', () => {
              writable.write(end)
              writable.end()
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
  type PreparedTemplate,
  prepareStreamingTemplate,
  prepareTemplate,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  type StreamableHeadContext,
  type StreamingTemplateParts,
  type WebStreamableHeadContext,
  wrapStream,
} from 'unhead/stream/server'
