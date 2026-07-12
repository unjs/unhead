import type { JSX } from 'solid-js'
import type { ServerUnhead } from 'unhead/server'
import type { CreateStreamableServerHeadOptions, ResolvableHead, SSRHeadPayload, Unhead } from 'unhead/types'
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
export interface SolidStreamableHeadContext<I = ResolvableHead> {
  head: ServerUnhead<I>
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

type CreateStreamableHeadArgs<Input> = ResolvableHead extends Input
  ? [options?: CreateStreamableServerHeadOptions<Input>]
  : [options: CreateStreamableServerHeadOptions<Input> & { disableDefaults: true }]

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
export function createStreamableHead(options?: CreateStreamableServerHeadOptions<ResolvableHead>): SolidStreamableHeadContext<ResolvableHead>
export function createStreamableHead<I>(options: CreateStreamableServerHeadOptions<I> & { disableDefaults: true }): SolidStreamableHeadContext<I>
export function createStreamableHead<I>(options: CreateStreamableServerHeadOptions<I>): SolidStreamableHeadContext<I | ResolvableHead>
export function createStreamableHead<I = ResolvableHead>(...args: CreateStreamableHeadArgs<I>): SolidStreamableHeadContext<I>
export function createStreamableHead<I = ResolvableHead>(options: CreateStreamableServerHeadOptions<I> = {}): SolidStreamableHeadContext<I> {
  const { head } = _createStreamableHead<I>(options as CreateStreamableServerHeadOptions<I> & { disableDefaults: true })

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
      let stopped = false
      let terminalDelivered = false
      let pumpDone: Promise<void> = Promise.resolve()
      let cancelInner: (reason: unknown) => Promise<unknown> = async () => undefined
      let resolveStopped = () => {}
      const stoppedSignal = new Promise<void>((resolve) => {
        resolveStopped = resolve
      })

      const stop = () => {
        if (stopped)
          return false
        stopped = true
        resolveStopped()
        return true
      }

      let flushOutput = () => {}

      return new ReadableStream<Uint8Array>({
        start(controller) {
          let shellResolved = false
          let shellFlushed = false
          let innerDone = false
          let end = ''
          let shellState: SSRHeadPayload | undefined
          const bufferedChunks: Uint8Array[] = []
          const outputChunks: Uint8Array[] = []
          let outputChunkIndex = 0
          let hasOutputError = false
          let outputError: unknown
          let outputClosed = false

          flushOutput = () => {
            if (terminalDelivered)
              return
            while (outputChunkIndex < outputChunks.length && (controller.desiredSize ?? 0) > 0) {
              controller.enqueue(outputChunks[outputChunkIndex++]!)
            }
            if (outputChunkIndex === outputChunks.length) {
              outputChunks.length = 0
              outputChunkIndex = 0
            }
            if (outputChunks.length)
              return
            if (hasOutputError) {
              if ((controller.desiredSize ?? 0) <= 0)
                return
              terminalDelivered = true
              controller.error(outputError)
              return
            }
            if (outputClosed) {
              terminalDelivered = true
              controller.close()
            }
          }

          const enqueueOutput = (chunk: Uint8Array) => {
            if (hasOutputError || outputClosed || terminalDelivered)
              return
            outputChunks.push(chunk)
            flushOutput()
          }

          const closeOutput = () => {
            if (hasOutputError || terminalDelivered)
              return
            outputClosed = true
            stop()
            flushOutput()
          }

          const fail = (error: unknown) => {
            if (terminalDelivered)
              return
            stop()
            hasOutputError = true
            outputError = error
            flushOutput()
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
            if (stopped || !shellResolved)
              return

            try {
              if (!shellFlushed) {
                const prepared = prepareStreamingTemplate(head, template, shellState)
                enqueueOutput(encoder.encode(prepared.shell))
                end = prepared.end
                shellFlushed = true
              }

              if (bufferedChunks.length) {
                for (const chunk of bufferedChunks) {
                  enqueueOutput(chunk)
                }
                bufferedChunks.length = 0
              }

              if (innerDone) {
                enqueueOutput(encoder.encode(end))
                closeOutput()
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
                if (stopped)
                  break
                const { done, value } = await reader!.read()
                if (stopped)
                  break
                if (done) {
                  innerDone = true
                  flushShellAndChunks()
                  break
                }
                if (shellFlushed) {
                  enqueueOutput(value)
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
                stoppedSignal.then(() => undefined),
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
        pull() {
          flushOutput()
        },
        async cancel(reason?: unknown) {
          stop()
          terminalDelivered = true
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
export function HeadStream(): JSX.Element {
  const head = useContext(UnheadContext)
  if (!head)
    return null

  // During shell rendering, don't output anything - entries will be captured by onCompleteShell
  // @ts-expect-error - custom property for SolidJS streaming
  if (!head._solidShellComplete)
    return null

  const update = renderSSRHeadSuspenseChunk(head as unknown as Unhead<ResolvableHead, unknown>)
  if (!update)
    return null

  return ssr(scriptTemplate, update) as unknown as JSX.Element
}
