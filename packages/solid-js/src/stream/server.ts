import type { ServerUnhead } from 'unhead/server'
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
  head: ServerUnhead
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
      const shellState = head.render()
      head.entries.clear()
      // @ts-expect-error - custom property for SolidJS streaming
      head._solidShellComplete = true
      resolveShellReady(shellState)
    },
    wrapStream: (stream: ReadableStream<Uint8Array>, template: string) => {
      const encoder = new TextEncoder()
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
      let readerReleased = false
      let settled = false
      let pumpDone: Promise<void> = Promise.resolve()
      let cancelInner: (reason: unknown) => Promise<unknown> = async () => undefined
      let resolveSettled = () => {}
      const settledSignal = new Promise<void>((resolve) => {
        resolveSettled = resolve
      })

      const settle = () => {
        if (settled)
          return false
        settled = true
        resolveSettled()
        return true
      }

      return new ReadableStream<Uint8Array>({
        start(controller) {
          let shellResolved = false
          let shellFlushed = false
          let innerDone = false
          let end = ''
          let shellState: SSRHeadPayload | undefined
          const bufferedChunks: Uint8Array[] = []

          const fail = (error: unknown) => {
            if (!settle())
              return
            controller.error(error)
          }

          const releaseReader = () => {
            if (!reader || readerReleased)
              return
            reader.releaseLock()
            readerReleased = true
          }

          cancelInner = async (reason: unknown): Promise<unknown> => {
            if (!reader || readerReleased)
              return
            try {
              await reader.cancel(reason)
            }
            catch (error) {
              return error
            }
          }

          const flushShellAndChunks = () => {
            if (settled || !shellResolved)
              return

            try {
              if (!shellFlushed) {
                const prepared = prepareStreamingTemplate(head, template, shellState)
                controller.enqueue(encoder.encode(prepared.shell))
                end = prepared.end
                shellFlushed = true
              }

              while (bufferedChunks.length) {
                controller.enqueue(bufferedChunks.shift()!)
              }

              if (innerDone) {
                controller.enqueue(encoder.encode(end))
                settle()
                controller.close()
              }
            }
            catch (error) {
              fail(error)
              void cancelInner(error)
            }
          }

          try {
            reader = stream.getReader()
          }
          catch (error) {
            fail(error)
            return
          }

          // Read immediately so app stream failures before onCompleteShell do not hang the wrapper.
          pumpDone = (async () => {
            try {
              while (true) {
                if (settled)
                  break
                const { done, value } = await reader!.read()
                if (settled)
                  break
                if (done) {
                  innerDone = true
                  flushShellAndChunks()
                  break
                }
                if (shellFlushed) {
                  controller.enqueue(value)
                }
                else {
                  bufferedChunks.push(value)
                  flushShellAndChunks()
                }
              }
            }
            catch (error) {
              fail(error)
            }
            finally {
              releaseReader()
            }
          })()

          void (async () => {
            try {
              const ready = await Promise.race([
                shellReady.then(state => ({ state })),
                settledSignal.then(() => undefined),
              ])
              if (!ready)
                return
              shellState = ready.state
              shellResolved = true
              flushShellAndChunks()
            }
            catch (error) {
              fail(error)
              void cancelInner(error)
            }
          })()
        },
        async cancel(reason?: unknown) {
          settle()
          const cancelError = await cancelInner(reason)
          await pumpDone
          if (cancelError)
            throw cancelError
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
