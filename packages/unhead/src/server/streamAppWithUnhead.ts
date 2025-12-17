import type { HeadTag, SerializableHead, Unhead } from '../types'
import { renderSSRHead } from './renderSSRHead'

// Default key for window attachment
const DEFAULT_STREAM_KEY = '__unhead__'

function getStreamKey(head: Unhead<any>): string {
  return head.resolvedOptions.experimentalStreamKey || DEFAULT_STREAM_KEY
}

function createBootstrapScript(key: string): string {
  return `<script>window.${key}={_q:[],push(e){this._q.push(e)}}</script>`
}

/**
 * @experimental
 *
 * Renders the app shell with initial head tags for streaming SSR.
 * Call this once at the start before streaming app content.
 *
 * @param head - The Unhead instance
 * @param template - HTML template string containing <html>, <head>, </head>, <body>
 * @returns Rendered shell with head tags and streaming bootstrap injected
 *
 * @example
 * ```ts
 * const shell = await renderSSRHeadShell(head, `
 *   <!DOCTYPE html>
 *   <html>
 *   <head></head>
 *   <body>
 * `)
 * res.write(shell)
 * ```
 */
export async function renderSSRHeadShell(head: Unhead<any>, template: string): Promise<string> {
  // Initialize streaming state
  head._streamedHashes = new Set()

  const ssr = await renderSSRHead(head)
  const streamKey = getStreamKey(head)

  // Track initial tags
  const tags = await head.resolveTags()
  for (const tag of tags) {
    head._streamedHashes.add(hashTag(tag))
  }

  let html = template

  // Inject head tags and bootstrap before </head>
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${ssr.headTags}${createBootstrapScript(streamKey)}</head>`)
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
 * const headUpdate = await renderSSRHeadSuspenseChunk(head)
 * if (headUpdate) {
 *   res.write(`<script>${headUpdate}</script>`)
 * }
 * ```
 */
export async function renderSSRHeadSuspenseChunk(head: Unhead<any>): Promise<string> {
  if (!head._streamedHashes) {
    head._streamedHashes = new Set()
  }

  const currentTags = await head.resolveTags()
  const newTags = currentTags.filter((tag) => {
    const hash = hashTag(tag)
    if (head._streamedHashes!.has(hash))
      return false
    head._streamedHashes!.add(hash)
    return true
  })

  if (!newTags.length)
    return ''

  const streamKey = getStreamKey(head)
  const serializedHead = tagsToSerializableHead(newTags)
  return `window.${streamKey}.push(${JSON.stringify(serializedHead)})`
}

/**
 * @experimental
 *
 * Renders the closing body tags for streaming SSR.
 * Call this at the end to inject any remaining body-positioned scripts.
 *
 * @param head - The Unhead instance
 * @returns Body tags to inject before </body>
 */
export async function renderSSRHeadClosing(head: Unhead<any>): Promise<string> {
  const ssr = await renderSSRHead(head)
  return ssr.bodyTags
}

/**
 * Converts resolved tags to a serializable head object for client hydration
 */
function tagsToSerializableHead(tags: HeadTag[]): SerializableHead {
  const head: SerializableHead = {}

  for (const tag of tags) {
    if (tag.tag === 'title') {
      head.title = tag.textContent
    }
    else if (tag.tag === 'titleTemplate') {
      head.titleTemplate = tag.textContent
    }
    else if (tag.tag === 'htmlAttrs') {
      head.htmlAttrs = serializeAttrs(tag.props)
    }
    else if (tag.tag === 'bodyAttrs') {
      head.bodyAttrs = serializeAttrs(tag.props)
    }
    else {
      const tagArray = (head as any)[tag.tag] = (head as any)[tag.tag] || []
      const serialized: Record<string, any> = { ...tag.props }
      if (tag.innerHTML)
        serialized.innerHTML = tag.innerHTML
      if (tag.textContent)
        serialized.textContent = tag.textContent
      if (tag.tagPosition)
        serialized.tagPosition = tag.tagPosition
      if (tag.tagPriority)
        serialized.tagPriority = tag.tagPriority
      tagArray.push(serialized)
    }
  }

  return head
}

/**
 * Serialize attrs, converting Set/Map to plain objects
 */
function serializeAttrs(props: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(props)) {
    if (value instanceof Set) {
      result[key] = [...value].join(' ')
    }
    else if (value instanceof Map) {
      result[key] = Object.fromEntries(value)
    }
    else {
      result[key] = value
    }
  }
  return result
}

/**
 * Create a hash for a tag to detect duplicates/changes
 */
function hashTag(tag: HeadTag): string {
  return `${tag.tag}:${tag._d || ''}:${tag.textContent || ''}:${JSON.stringify(tag.props)}`
}

/**
 * @experimental
 *
 * Convenience wrapper that streams an app with automatic head management.
 * Uses renderSSRHeadShell, renderSSRHeadSuspenseChunk, and renderSSRHeadClosing internally.
 *
 * Looks for `<!--[unhead-ssr]-->` markers in chunks to inject head updates.
 *
 * @param appStream - The async iterable stream of app chunks
 * @param template - HTML template containing <html>, </head>, <body>, and <!--app-html--> placeholder
 * @param head - The Unhead instance for this request
 * @yields Processed HTML chunks with head updates applied
 */
export async function* streamAppWithUnhead(
  appStream: AsyncIterable<Uint8Array | string>,
  template: string,
  head: Unhead<any>,
): AsyncGenerator<string> {
  const [htmlStart, htmlEnd] = template.split('<!--app-html-->')
  let firstChunk = true

  // Render shell with initial head
  const shell = await renderSSRHeadShell(head, htmlStart)

  for await (const chunk of appStream) {
    const chunkStr = typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk)

    if (firstChunk) {
      firstChunk = false
      yield shell + chunkStr
    }
    else if (chunkStr.includes('<!--[unhead-ssr]-->')) {
      const headUpdate = await renderSSRHeadSuspenseChunk(head)
      yield chunkStr.replace('<!--[unhead-ssr]-->', headUpdate ? `<script>${headUpdate}</script>` : '')
    }
    else {
      yield chunkStr
    }
  }

  // Final body tags
  const closing = await renderSSRHeadClosing(head)
  yield htmlEnd.replace('</body>', `${closing}</body>`)
}
