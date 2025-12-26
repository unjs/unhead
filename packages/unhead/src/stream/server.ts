import type { CreateStreamableServerHeadOptions, ResolvableHead, Unhead } from '../types'
import { createHead } from '../server/createHead'
import { renderSSRHead } from '../server/renderSSRHead'

export * from '../server'

/**
 * Creates a head instance configured for streaming SSR.
 * Use with renderSSRHeadShell and renderSSRHeadSuspenseChunk.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createStreamableHead<T = ResolvableHead>(options: CreateStreamableServerHeadOptions = {}) {
  const { streamKey, ...rest } = options
  return createHead<T>({
    ...rest,
    experimentalStreamKey: streamKey,
  })
}
// Default key for window attachment
const DEFAULT_STREAM_KEY = '__unhead__'

function getStreamKey(head: Unhead<any>): string {
  return head.resolvedOptions.experimentalStreamKey || DEFAULT_STREAM_KEY
}

/**
 * @experimental
 *
 * Renders the app shell with initial head tags for streaming SSR.
 * Call this once at the start before streaming app content.
 *
 * Requires the Vite plugin with `streaming: true` to inject the bootstrap
 * script and streaming client via `transformIndexHtml`.
 *
 * @param head - The Unhead instance
 * @param template - HTML template string containing <html>, <head>, </head>, <body>
 * @returns Rendered shell with head tags injected
 *
 * @example
 * ```ts
 * const shell = await renderSSRHeadShell(head, template)
 * ```
 */
export async function renderSSRHeadShell(head: Unhead<any>, template: string): Promise<string> {
  const ssr = await renderSSRHead(head)
  head.entries.clear()
  const streamKey = getStreamKey(head)
  // Bootstrap script that creates queue for streaming updates
  const bootstrapScript = `<script>window.${streamKey}={_q:[],push(e){this._q.push(e)}}</script>`

  let html = template

  // Inject bootstrap + head tags before </head>
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${bootstrapScript}${ssr.headTags}</head>`)
  }

  // Apply html attrs
  if (html.includes('<html') && ssr.htmlAttrs) {
    html = html.replace('<html', `<html ${ssr.htmlAttrs}`)
  }

  // Apply body attrs
  if (html.includes('<body') && ssr.bodyAttrs) {
    html = html.replace('<body', `<body ${ssr.bodyAttrs}`)
  }

  return html
}

/**
 * @experimental
 *
 * Renders head updates for a suspense boundary chunk.
 * Call this when a suspense boundary resolves to get any new head tags.
 *
 * @param head - The Unhead instance (must have called renderSSRHeadShell first)
 * @returns Script content to push new head entries, or empty string if no updates
 *
 * @example
 * ```ts
 * // In your streaming suspense boundary handler:
 * const headUpdate = renderSSRHeadSuspenseChunk(head)
 * if (headUpdate) {
 *   res.write(`<script>${headUpdate}</script>`)
 * }
 * ```
 */
export function renderSSRHeadSuspenseChunk(head: Unhead<any>): string {
  if (!head.entries.size)
    return ''

  const streamKey = getStreamKey(head)
  const inputs = [...head.entries.values()].map(e => e.input)
  head.entries.clear()
  return `window.${streamKey}.push(${safeJsonStringify(inputs)})`
}

/**
 * Safe JSON stringify that escapes characters that could break script context
 */
function safeJsonStringify(obj: any): string {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}

export type { CreateStreamableServerHeadOptions, SSRHeadPayload, Unhead } from '../types'
