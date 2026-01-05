import type { CreateStreamableServerHeadOptions, SSRHeadPayload } from 'unhead/types'
import { useContext } from 'solid-js'
import { ssr } from 'solid-js/web'
import {
  createStreamableHead as _createStreamableHead,
  prepareStreamingTemplate,
  renderSSRHeadSuspenseChunk,
} from 'unhead/stream/server'
import { UnheadContext } from '../context'

export { UnheadContext } from '../context'
export {
  prepareStreamingTemplate,
  renderSSRHeadShell,
  renderSSRHeadSuspenseChunk,
  type StreamingTemplateParts,
  type WebStreamableHeadContext,
  wrapStream,
} from 'unhead/stream/server'

/**
 * Solid-js streaming context returned by createStreamableHead.
 */
export interface SolidStreamableHeadContext {
  head: ReturnType<typeof _createStreamableHead>['head']
  /**
   * Callback to pass to renderToStream's onCompleteShell option.
   * This captures head entries from shell components before streaming starts.
   */
  onCompleteShell: () => void
  /**
   * Wrap a web ReadableStream to handle head injection automatically.
   * Must be called after onCompleteShell has fired.
   */
  wrapStream: (stream: ReadableStream<Uint8Array>, template: string) => ReadableStream<Uint8Array>
}

/**
 * Creates a head instance configured for Solid-js streaming SSR.
 *
 * @example
 * ```tsx
 * const { head, onCompleteShell, wrapStream } = createStreamableHead()
 *
 * const stream = renderToStream(() => (
 *   <UnheadContext.Provider value={head}>
 *     <App />
 *   </UnheadContext.Provider>
 * ), { onCompleteShell })
 *
 * return wrapStream(stream, template)
 * ```
 */
export function createStreamableHead(options: CreateStreamableServerHeadOptions = {}): SolidStreamableHeadContext {
  const { head } = _createStreamableHead(options)

  // Promise that resolves when shell is ready with captured state
  let resolveShellReady: (state: SSRHeadPayload) => void
  const shellReady = new Promise<SSRHeadPayload>((resolve) => {
    resolveShellReady = resolve
  })

  // Track shell completion for HeadStream to know when to start streaming
  // @ts-expect-error - custom property for SolidJS streaming
  head._solidShellComplete = false

  return {
    head,
    onCompleteShell: () => {
      // Capture head entries from shell components before streaming starts
      const shellState = head.render() as SSRHeadPayload
      head.entries.clear()
      // @ts-expect-error - custom property for SolidJS streaming
      head._solidShellComplete = true
      resolveShellReady(shellState)
    },
    wrapStream: (stream: ReadableStream<Uint8Array>, template: string) => {
      const encoder = new TextEncoder()

      return new ReadableStream<Uint8Array>({
        async start(controller) {
          // Wait for shell to be ready before writing
          const shellState = await shellReady
          const { shell, end } = prepareStreamingTemplate(head, template, shellState)
          controller.enqueue(encoder.encode(shell))

          const reader = stream.getReader()
          while (true) {
            const { done, value } = await reader.read()
            if (done)
              break
            controller.enqueue(value)
          }
          reader.releaseLock()

          controller.enqueue(encoder.encode(end))
          controller.close()
        },
      })
    },
  }
}

const scriptTemplate = ['<script>', '</script>'] as TemplateStringsArray & string[]

/**
 * Streaming script component - outputs inline script with current head state.
 * The Vite plugin with streaming: true auto-injects this.
 *
 * Note: In SolidJS, this only outputs content AFTER the shell is complete.
 * During shell rendering, we accumulate entries which are captured by onCompleteShell.
 */
export function HeadStream() {
  const head = useContext(UnheadContext)
  if (!head)
    return null

  // During shell rendering, don't output anything - entries will be captured by onCompleteShell
  // @ts-expect-error - custom property for SolidJS streaming
  if (!head._solidShellComplete)
    return null

  const update = renderSSRHeadSuspenseChunk(head)
  if (!update)
    return null

  return ssr(scriptTemplate, update)
}
