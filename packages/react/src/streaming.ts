import type { Readable } from 'node:stream'
import type { Unhead } from 'unhead'
import { Buffer } from 'node:buffer'
import { renderSSRHead } from 'unhead'

export interface RenderReactStreamOptions {
  /**
   * The Express response object to write to
   */
  res: any
  /**
   * The React stream from renderToPipeableStream
   */
  reactStream: Readable
  /**
   * The HTML template content before the app placeholder
   */
  htmlStart: string
  /**
   * The HTML template content after the app placeholder
   */
  htmlEnd: string
  /**
   * The Unhead instance containing head entries
   */
  head: Unhead
  /**
   * Timeout in milliseconds to wait before flushing the first chunk
   * This helps detect if we're within a Suspense boundary
   * @default 3
   */
  flushTimeout?: number
}

/**
 * Renders a React SSR stream with Unhead metadata injection
 *
 * This function handles streaming SSR with proper head tag injection:
 * 1. Buffers initial chunks to detect Suspense boundaries
 * 2. Injects head tags into the initial chunk
 * 3. Streams remaining chunks directly
 * 4. Injects body tags at the end
 *
 * @example
 * ```ts
 * import { renderToPipeableStream } from 'react-dom/server'
 * import { renderReactStream } from '@unhead/react/streaming'
 *
 * const head = createHead()
 * const { pipe } = renderToPipeableStream(
 *   <UnheadProvider value={head}>
 *     <App />
 *   </UnheadProvider>,
 *   {
 *     onShellReady() {
 *       const reactStream = new PassThrough()
 *       pipe(reactStream)
 *
 *       renderReactStream({
 *         res,
 *         reactStream,
 *         htmlStart,
 *         htmlEnd,
 *         head,
 *       })
 *     }
 *   }
 * )
 * ```
 */
export async function renderReactStream(options: RenderReactStreamOptions): Promise<void> {
  const {
    res,
    reactStream,
    htmlStart,
    htmlEnd,
    head,
    flushTimeout = 3,
  } = options

  res.status(200).set({
    'Content-Type': 'text/html; charset=utf-8',
  })

  const bufferChunks: Buffer[] = []
  let flushTimer: NodeJS.Timeout | null = null
  let isStreaming = false
  let hasWrittenFirst = false

  async function writeFirstChunk() {
    if (hasWrittenFirst)
      return

    hasWrittenFirst = true
    const bufferedContent = Buffer.concat(bufferChunks).toString('utf-8')
    bufferChunks.length = 0

    const headHtml = await renderSSRHead(head)
    const htmlWithHead = htmlStart.replace('</head>', `${headHtml.headTags}</head>`)
    res.write(htmlWithHead + bufferedContent)
  }

  reactStream.on('data', (chunk: Buffer) => {
    if (res.destroyed)
      return

    if (isStreaming) {
      res.write(chunk)
      return
    }

    bufferChunks.push(chunk)

    if (flushTimer)
      clearTimeout(flushTimer)

    flushTimer = setTimeout(async () => {
      isStreaming = true
      if (bufferChunks.length > 0) {
        await writeFirstChunk()
      }
    }, flushTimeout)
  })

  reactStream.on('end', async () => {
    if (res.destroyed)
      return

    // Write any remaining buffered chunks with head tags
    if (bufferChunks.length > 0) {
      await writeFirstChunk()
    }

    // Inject body tags at the end
    const headHtml = await renderSSRHead(head)
    res.write(htmlEnd.replace('</body>', `${headHtml.bodyTags}</body>`))
    res.end()
  })

  reactStream.on('error', (error: Error) => {
    if (!res.headersSent) {
      res.status(500).set({ 'Content-Type': 'text/plain' })
    }
    console.error('React stream error:', error)
    res.end()
  })
}
