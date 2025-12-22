import type { CreateStreamableServerHeadOptions, HeadTag, ResolvableHead, SerializableHead, Unhead } from '../types'
import { createHead } from '../server/createHead'
import { renderSSRHead } from '../server/renderSSRHead'
import { dedupeKey, normalizeEntryToTags, tagWeight } from '../utils'

export * from '../server'

/**
 * Creates a head instance configured for streaming SSR.
 * Use with renderSSRHeadShell, renderSSRHeadSuspenseChunk, and renderSSRHeadClosing.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createStreamableHead<T = ResolvableHead>(options: CreateStreamableServerHeadOptions = {}) {
  const { streamKey, ...rest } = options
  const head = createHead<T>({
    ...rest,
    experimentalStreamKey: streamKey,
  })
  head._streamedHashes = new Set()
  return head
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
  // Initialize streaming state
  head._streamedHashes = new Set()

  const ssr = await renderSSRHead(head)

  // Track initial tags
  const tags = await head.resolveTags()
  for (const tag of tags) {
    head._streamedHashes.add(hashTag(tag))
  }

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
  console.log('ssr chunk', currentTags)
  return buildHeadChunk(head, currentTags)
}

/**
 * @experimental
 *
 * Synchronous version of renderSSRHeadSuspenseChunk for use in React components.
 * Normalizes entries inline without hook calls, so some plugin transformations may be skipped.
 *
 * This is useful for React's HeadStream component which needs to output the
 * push code directly during render (no stream transformation needed).
 *
 * @param head - The Unhead instance (must have called renderSSRHeadShell first)
 * @returns Script content to push new head entries, or empty string if no updates
 */
export function renderSSRHeadSuspenseChunkSync(head: Unhead<any>): string {
  if (!head._streamedHashes) {
    head._streamedHashes = new Set()
  }

  const entries = head.headEntries()

  // Build tags synchronously from current entries
  // For entries with _tags already set (normalized), use those
  // For new entries, do inline normalization (skips hooks)
  const currentTags: HeadTag[] = []
  for (const entry of entries) {
    if (entry._tags) {
      currentTags.push(...entry._tags)
    }
    else if (entry.input) {
      // Inline normalization for new entries - this skips hooks but works for basic cases
      const tags = normalizeEntryToTags(entry.input, head.resolvedOptions.propResolvers || [])
      for (let i = 0; i < tags.length; i++) {
        const t = tags[i]
        Object.assign(t, entry.options)
        t._w = tagWeight(head, t)
        t._p = (entry._i << 10) + i
        t._d = dedupeKey(t)
        currentTags.push(t)
      }
      // Cache for future calls
      entry._tags = tags
    }
  }

  return buildHeadChunk(head, currentTags)
}

/**
 * Shared logic for building head chunk from tags
 */
function buildHeadChunk(head: Unhead<any>, currentTags: HeadTag[]): string {
  const newTags = currentTags.filter((tag) => {
    // Exclude body-positioned tags - they go in renderSSRHeadClosing
    if (tag.tagPosition === 'bodyClose' || tag.tagPosition === 'bodyOpen') {
      return false
    }
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
  return `window.${streamKey}.push(${safeJsonStringify(serializedHead)})`
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
      if (tag.key)
        serialized.key = tag.key
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
  return `${tag.tag}:${tag._d || ''}:${tag.textContent || ''}:${tag.innerHTML || ''}:${serializePropsForHash(tag.props)}`
}

/**
 * @experimental
 *
 * Convenience wrapper that streams an app with automatic head management.
 * Uses renderSSRHeadShell and renderSSRHeadClosing internally.
 *
 * Requires the Vite plugin with `streaming: true` to inject the bootstrap
 * script and streaming client via `transformIndexHtml`.
 *
 * @param appStream - The async iterable stream of app chunks
 * @param template - HTML template containing <html>, </head>, <body>, and <!--app-html--> placeholder
 * @param head - The Unhead instance for this request
 * @yields Processed HTML chunks with head updates applied
 */
export async function* streamWithHead(
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
    else {
      yield chunkStr
    }
  }

  // Final body tags
  const closing = await renderSSRHeadClosing(head)
  yield htmlEnd.replace('</body>', `${closing}</body>`)
}

/**
 * Serialize props for hashing, handling Set and Map values
 */
export function serializePropsForHash(props: Record<string, any>): string {
  const serialized: Record<string, any> = {}
  for (const [key, value] of Object.entries(props)) {
    if (value instanceof Set) {
      serialized[key] = [...value].sort().join(' ')
    }
    else if (value instanceof Map) {
      serialized[key] = Object.fromEntries(value)
    }
    else {
      serialized[key] = value
    }
  }
  return JSON.stringify(serialized)
}

export type { CreateStreamableServerHeadOptions, SSRHeadPayload, Unhead } from '../types'
