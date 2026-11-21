import type { PreparedHtmlTemplateWithIndexes, PreparedTemplate } from '../parser'
import type { ServerUnhead } from '../server/createHead'
import type { CreateStreamableServerHeadOptions, HeadEntry, HeadTag, ResolvableHead, SSRHeadPayload, Unhead } from '../types'
import { applyHeadToHtml, parseHtmlForIndexes } from '../parser'
import { createHead } from '../server/createHead'
import { dedupeKey, hashTag } from '../utils/dedupe'
import { callHook } from '../utils/hooks'
import { normalizeEntryToTags, normalizeProps, resolveHeadInput } from '../utils/normalize'
import { DEFAULT_STREAM_KEY } from './client'
import { parseStreamKey } from './key'

const LT_RE = /</g
const GT_RE = />/g
const AMP_RE = /&/g

// Lazy pure memo (CONTRIBUTING.md side-effects policy): constant-derived,
// stateless, so it can be shared across streams without import-time work.
let encoder: TextEncoder | undefined
let preparedStreamingLayouts: WeakMap<PreparedTemplate, StreamingTemplateLayout | null> | undefined

/**
 * Base context with just the head instance.
 * Extended by framework-specific contexts.
 */
export interface BaseStreamableHeadContext<T = ResolvableHead> {
  /**
   * The Unhead instance to provide to your framework
   */
  head: ServerUnhead<T>
}

/**
 * Context returned by createStreamableHead for streaming SSR.
 * Includes shell coordination utilities for framework wrappers.
 */
export interface StreamableHeadContext<T = ResolvableHead> extends BaseStreamableHeadContext<T> {
  /**
   * Call this when the shell is ready.
   * Pass to your framework's onShellReady callback.
   */
  onShellReady: () => void
  /**
   * Promise that resolves when shell is ready.
   * Use this to coordinate stream wrapping in framework-specific code.
   */
  shellReady: Promise<void>
}

/**
 * Context for frameworks using web streams (Vue, Solid, Svelte).
 * Provides a wrapStream helper for easy stream wrapping.
 */
export interface WebStreamableHeadContext<T = ResolvableHead> extends BaseStreamableHeadContext<T> {
  /**
   * Wrap a web ReadableStream to handle head injection automatically.
   * @param stream - The app's ReadableStream
   * @param template - The HTML template (string or `prepareTemplate()` result)
   * @returns A new ReadableStream with shell and closing HTML included
   */
  wrapStream: (stream: ReadableStream<Uint8Array>, template: string | PreparedTemplate) => ReadableStream<Uint8Array>
}

/**
 * Creates a head instance configured for streaming SSR.
 *
 * Returns a context with:
 * - `head`: The Unhead instance for your framework's provider
 * - `onShellReady`: Callback to pass to your framework's streaming API
 * - `shellReady`: Promise that resolves when shell is ready
 *
 * Each framework package (@unhead/react, @unhead/vue, etc.) may extend this
 * with framework-specific streaming utilities.
 *
 * @example
 * ```ts
 * const { head, onShellReady, shellReady } = createStreamableHead()
 * ```
 */
/* @__NO_SIDE_EFFECTS__ */
export function createStreamableHead<T = ResolvableHead>(
  options: CreateStreamableServerHeadOptions = {},
): StreamableHeadContext<T> {
  const { streamKey, writesBodyTags, nonce, ...rest } = options
  const parsedStreamKey = streamKey === undefined ? undefined : parseStreamKey(streamKey)
  const head = createHead<T>({
    ...rest,
    experimentalStreamKey: parsedStreamKey,
  })
  if (writesBodyTags)
    streamState(head).writesBodyTags = true
  if (nonce)
    streamState(head).nonce = nonce

  let resolveShellReady: () => void
  const shellReady = new Promise<void>((resolve) => {
    resolveShellReady = resolve
  })

  return {
    head,
    onShellReady: () => resolveShellReady(),
    shellReady,
  }
}
function getStreamKey(head: Unhead<any>): string {
  const key = head.resolvedOptions.experimentalStreamKey || DEFAULT_STREAM_KEY
  return parseStreamKey(key)
}

/**
 * Generates the bootstrap script that creates the streaming queue on the window object.
 * This script is injected into the shell and must run before any streaming updates.
 *
 * For frameworks that construct HTML programmatically (without a template),
 * use this directly to inject the bootstrap into your shell `<head>`.
 *
 * @param streamKey - The window property name for the stream queue (default: '__unhead__')
 * @param nonce - Optional CSP nonce to stamp on the script tag
 * @returns An inline `<script>` tag string
 */
export function createBootstrapScript(streamKey: string = DEFAULT_STREAM_KEY, nonce?: string): string {
  const parsedStreamKey = parseStreamKey(streamKey)
  const nonceAttr = renderNonceAttribute(nonce)
  // `inline` mode runs the client IIFE above this script, so never clobber an
  // already-installed queue. Doing so drops every streamed patch.
  return `<script${nonceAttr}>window.${parsedStreamKey}||(window.${parsedStreamKey}={_q:[],push(e){this._q.push(e)}})</script>`
}

function renderNonceAttribute(nonce?: string): string {
  return nonce ? ` nonce="${nonce.replace(AMP_RE, '&amp;').replace(/"/g, '&quot;')}"` : ''
}

/**
 * Renders the current head state and clears entries atomically.
 *
 * Use this for frameworks that construct HTML programmatically (without a template)
 * where `renderSSRHeadShell` / `prepareStreamingTemplate` aren't suitable.
 *
 * @param head - The Unhead instance
 * @returns The rendered SSR head payload
 *
 * @example
 * ```ts
 * const { headTags, bodyTags, bodyTagsOpen, htmlAttrs, bodyAttrs } = renderShell(head)
 * const shell = `<!DOCTYPE html><html${htmlAttrs}><head>${headTags}</head><body${bodyAttrs}>${bodyTagsOpen}`
 *
 * // Stream the app, then close it with the streamed body tags.
 * res.end(`${renderStreamBodyTags(head)}${bodyTags}</body></html>`)
 * ```
 */
export function renderShell(head: Unhead<any, SSRHeadPayload>): SSRHeadPayload {
  const result = head.render()
  rememberShellBodyTags(head)
  head.entries.clear()
  streamState(head).shellRendered = true
  return result
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
 * @param template - HTML template containing <html>, <head>, </head>, <body> (string or `prepareTemplate()` result)
 * @returns Rendered shell with head tags injected
 *
 * @example
 * ```ts
 * const shell = renderSSRHeadShell(head, template)
 * ```
 */
export function renderSSRHeadShell(head: Unhead<any>, template: string | PreparedTemplate): string {
  const ssr = head.render() as SSRHeadPayload
  const parsed = typeof template === 'string' ? parseHtmlForIndexes(template, ssr.bodyTags ? 'body-close' : 'body-open') : template
  const result = applyShellToTemplate(head, ssr, parsed)
  rememberShellBodyTags(head)
  // Keep entries when template rendering fails, so the caller can retry.
  head.entries.clear()
  streamState(head).shellRendered = true
  return result
}

/**
 * Injects the bootstrap script and full head payload into a whole template.
 * Shared by renderSSRHeadShell and prepareStreamingTemplate's no-split fallback.
 */
function applyShellToTemplate(head: Unhead<any>, ssr: SSRHeadPayload, parsed: ReturnType<typeof parseHtmlForIndexes>): string {
  return applyHeadToHtml(parsed, {
    htmlAttrs: ssr.htmlAttrs,
    headTags: createBootstrapScript(getStreamKey(head), head._stream?.nonce) + ssr.headTags,
    bodyAttrs: ssr.bodyAttrs,
    bodyTagsOpen: ssr.bodyTagsOpen,
    bodyTags: ssr.bodyTags,
  })
}

/**
 * Normalizes the entries that have not been flushed yet, for inspection only.
 *
 * Mirrors only the parts of `resolveTags` that no listener can redo: entry
 * options and the `_p` packing. Plugin-owned shapes (`_flatMeta`, the legacy
 * `body` prop, `useHeadSafe` filtering) stay unresolved so the SSR bundle does
 * not carry a second copy of every plugin's normalization.
 *
 * It deliberately does not run the `entries:normalize` hook, because listeners
 * there hold per-resolve state that a second pass would corrupt.
 */
function normalizePendingTags(head: Unhead<any>): { tags: HeadTag[], entries: Map<number, { input: any, resolved: any }> } {
  const propResolvers = head.resolvedOptions.propResolvers || []
  const tags: HeadTag[] = []
  const entries = new Map<number, { input: any, resolved: any }>()
  for (const entry of head.entries.values()) {
    const resolved = resolveHeadInput(unwrapEntryInput(entry.input), propResolvers)
    entries.set(entry._i, { input: entry.input, resolved })
    let index = 0
    for (const tag of normalizeEntryToTags(resolved, [])) {
      if (entry.options)
        Object.assign(tag, entry.options)
      // Same packing as `resolveTags`, so a consumer can recover the entry
      // that registered the tag and report its source location.
      tag._p = (entry._i << 10) + index++
      // `normalizeProps` assigns the entry's own object for templateParams
      // rather than copying it, so this is the one tag an inspector could
      // mutate into a later render.
      if (tag.tag === 'templateParams')
        tag.props = { ...tag.props }
      tags.push(tag)
    }
  }
  return { tags, entries }
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
const JSON_LD_TYPE_RE = /\bld\+json\b/i

function streamState(head: Unhead<any>) {
  return (head._stream ||= {})
}

function isStreamedBodyTag(tagName: string, tag: any, entryPosition?: string): boolean {
  if (!tag || typeof tag !== 'object')
    return false
  if (tagName === 'noscript')
    return true
  // An entry position applies when the tag has no position.
  const position = tag.tagPosition ?? entryPosition
  if (position === 'bodyClose' || position === 'bodyOpen')
    return true
  const type = tag.type ?? tag.props?.type
  return tagName === 'script' && typeof type === 'string' && JSON_LD_TYPE_RE.test(type)
}

function unwrapEntryInput(input: any): any {
  return typeof input === 'function' ? input() : input
}

function rememberShellBodyTags(head: Unhead<any>): void {
  const state = streamState(head)
  let seen = state.seen
  for (const entry of head.entries.values()) {
    const entryPosition = (entry.options as any)?.tagPosition
    for (const tag of entry._tags || entry._precomputedTags || []) {
      if (!isStreamedBodyTag(tag.tag, tag, entryPosition))
        continue
      seen ||= state.seen = new Set<string>()
      const content = tag.textContent || tag.innerHTML
      if (content)
        seen.add(String(content))
      seen.add(tag._d || tag._h || hashTag(tag))
    }
  }
}

function splitStreamedBodyTags(input: any, entryPosition: string | undefined, previousSeen: Set<string> | undefined, seen?: Set<string>): [patch: any, bodyTags: any, seen: Set<string> | undefined] | undefined {
  if (!input || typeof input !== 'object')
    return

  let patch: any
  let bodyTags: any
  for (const key in input) {
    const value = input[key]
    if (!Array.isArray(value))
      continue
    let rest: any[] | undefined
    let carried: any[] | undefined
    for (let index = 0; index < value.length; index++) {
      const tag = value[index]
      if (!isStreamedBodyTag(key, tag, entryPosition)) {
        rest?.push(tag)
        continue
      }
      rest ||= value.slice(0, index)
      seen ||= new Set(previousSeen)
      const normalized = normalizeProps({ tag: key as HeadTag['tag'], props: {} }, tag)
      const content = hashTag(normalized)
      // The shell already served this exact tag.
      if (seen.has(content))
        continue
      // The shell owns this slot. Keep updates in the client patch.
      const slot = dedupeKey(normalized)
      if (slot && seen.has(slot)) {
        rest.push(tag)
        continue
      }
      seen.add(content)
      // The body-open slot already flushed. Use the body-close slot.
      carried ||= []
      carried.push({ ...tag, tagPosition: 'bodyClose' })
    }
    if (!rest)
      continue
    (patch ||= { ...input })[key] = rest.length ? rest : undefined
    if (carried)
      (bodyTags ||= {})[key] = carried
  }

  if (!patch)
    return
  // No client patch remains when every tag becomes a streamed body tag.
  const hasPatch = Object.values(patch).some(value => value !== undefined)
  return [hasPatch ? patch : undefined, bodyTags, seen]
}

/**
 * Renders and clears streamed body tags.
 *
 * Manual drivers must write this before `</body>`.
 * `renderStreamEnd()` includes it for template streams.
 */
export function renderStreamBodyTags(head: Unhead<any>): string {
  const state = streamState(head)
  const bodyTagInputs = state.bodyTags
  if (!bodyTagInputs?.length) {
    return ''
  }

  // Use the server renderer for normalization, dedupe, and escaping.
  const restore = new Map(head.entries)
  head.entries.clear()
  try {
    for (const [input, safe] of bodyTagInputs)
      head.push(input, safe ? { _safe: true } : undefined)
    const bodyTags = (head.render() as SSRHeadPayload).bodyTags
    // Clear only after a successful render, so failures can retry.
    state.bodyTags = undefined
    return bodyTags
  }
  finally {
    head.entries.clear()
    for (const [k, v] of restore)
      head.entries.set(k, v)
  }
}

/**
 * Adds streamed body tags to the closing HTML.
 *
 * Manual drivers must write this instead of `parts.end`.
 *
 * @example
 * ```ts
 * const parts = prepareStreamingTemplate(head, template)
 * res.write(parts.shell)
 * // ...stream the app, calling renderSSRHeadSuspenseChunk per boundary
 * res.end(renderStreamEnd(head, parts))
 * ```
 */
export function renderStreamEnd(head: Unhead<any>, parts: StreamingTemplateParts): string {
  const bodyTags = renderStreamBodyTags(head)
  if (!bodyTags)
    return parts.end
  const at = parts.bodyTagsAt ?? parts.end.length
  return parts.end.slice(0, at) + bodyTags + parts.end.slice(at)
}

type StreamedTitleUpdate = [entry: HeadEntry<any>, original: unknown, resolved: Record<string, unknown>]

export function renderSSRHeadSuspenseChunk(head: Unhead<any>): string {
  if (!head.entries.size)
    return ''

  const streamKey = getStreamKey(head)
  const propResolvers = head.resolvedOptions.propResolvers || []
  let normalizedEntries: Map<number, { input: any, resolved: any }> | undefined
  // Resolve and serialize before clearing so a failure leaves the valid
  // entries intact for the next chunk.
  try {
    // Only pay for normalization when something is listening.
    if ((head.hooks as any)?._hooks?.['ssr:streamChunk']?.length) {
      const normalized = normalizePendingTags(head)
      normalizedEntries = normalized.entries
      callHook(head, 'ssr:streamChunk', { tags: normalized.tags })
    }
    const state = streamState(head)
    let nextSeen: Set<string> | undefined
    const inputs: any[] = []
    let bodyTags: typeof state.bodyTags
    let title = head._title
    let titleTemplate = head._titleTemplate
    let titleUpdate: StreamedTitleUpdate | undefined
    let templateUpdate: StreamedTitleUpdate | undefined
    for (const entry of head.entries.values()) {
      const original = entry.input
      const normalized = normalizedEntries?.get(entry._i)
      let input = normalized && normalized.input === original
        ? normalized.resolved
        : resolveHeadInput(unwrapEntryInput(original), propResolvers)
      // Streamed patches are replayed without the server head's plugins.
      const options = entry.options
      const safe = options?._safe
      if (safe) {
        input = head.plugins.get('safe')?._filterStreamInput?.(input)
        if (!input)
          continue
      }
      if (input?.title !== undefined) {
        title = typeof input.title === 'object' ? input.title?.textContent : input.title
        titleUpdate = [entry, original, input]
      }
      if (input?.titleTemplate !== undefined) {
        titleTemplate = input.titleTemplate?.textContent ?? input.titleTemplate
        templateUpdate = [entry, original, input]
      }
      const split = state.writesBodyTags && splitStreamedBodyTags(input, options?.tagPosition, state.seen, nextSeen)
      if (!split) {
        inputs.push(input)
        continue
      }
      const [patch, buffered, seen] = split
      nextSeen = seen
      if (patch)
        inputs.push(patch)
      if (buffered)
        (bodyTags ||= []).push([buffered, safe])
    }
    const titleChange = templateUpdate ?? titleUpdate
    let flushed: [HeadEntry<any>, unknown][] | undefined
    // The replay queue only accepts JSON. Preserve the raw title for later callbacks.
    if (typeof titleTemplate === 'function' && titleChange) {
      flushed = Array.from(head.entries.values(), entry => [entry, entry.input])
      try {
        inputs.push({ title: titleTemplate(title ?? undefined) ?? '', titleTemplate: null })
      }
      catch (error) {
        const [entry, original, resolved] = titleChange
        if (head.entries.get(entry._i) === entry && entry.input === original) {
          entry.input = { ...resolved, [templateUpdate ? 'titleTemplate' : 'title']: undefined }
          delete entry._tags
        }
        throw error
      }
    }
    else if (templateUpdate && !titleUpdate && typeof head._titleTemplate === 'function') {
      inputs.push({ title: title ?? '' })
    }
    const serialized = safeJsonStringify(inputs)
    head._title = title
    head._titleTemplate = titleTemplate
    if (nextSeen)
      state.seen = nextSeen
    if (bodyTags)
      (state.bodyTags ||= []).push(...bodyTags)
    if (flushed) {
      for (const [entry, input] of flushed) {
        if (head.entries.get(entry._i) === entry && entry.input === input)
          head.entries.delete(entry._i)
      }
    }
    else {
      head.entries.clear()
    }
    return inputs.length ? `window.${streamKey}.push(${serialized})` : ''
  }
  catch (error) {
    // Drop only entries that cannot resolve or serialize. Keeping one would
    // poison every subsequent chunk render with the same error.
    for (const [key, entry] of head.entries) {
      try {
        safeJsonStringify(resolveHeadInput(unwrapEntryInput(entry.input), propResolvers))
      }
      catch {
        head.entries.delete(key)
      }
    }
    throw error
  }
}

/**
 * Safe JSON stringify that escapes characters that could break script context
 */
function safeJsonStringify(obj: any): string {
  return JSON.stringify(obj)
    .replace(LT_RE, '\\u003c')
    .replace(GT_RE, '\\u003e')
    .replace(AMP_RE, '\\u0026')
}

/**
 * @experimental
 *
 * Wraps a web ReadableStream with head injection for streaming SSR.
 *
 * This is a convenience wrapper that:
 * 1. Prepares the template with head injection
 * 2. Writes the shell (with head tags)
 * 3. Streams the app content
 * 4. Writes the closing HTML (with body tags)
 *
 * @param head - The Unhead instance
 * @param stream - The app's ReadableStream (from renderToWebStream, etc.)
 * @param template - Full HTML template (string or `prepareTemplate()` result)
 * @param preRenderedState - Optional pre-rendered head payload to use for the shell
 * @param options - Optional streaming hooks
 * @param options.flushChunk - Returns extra HTML to emit after each app
 * chunk and once before the closing HTML (used by framework packages to
 * interleave head-update scripts)
 * @returns A new ReadableStream with shell and closing HTML included
 *
 * @example
 * ```ts
 * const appStream = renderToWebStream(app)
 * const fullStream = wrapStream(head, appStream, template)
 * return new Response(fullStream)
 * ```
 */
export function wrapStream(
  head: Unhead<any>,
  stream: ReadableStream<Uint8Array>,
  template: string | PreparedTemplate,
  preRenderedState?: SSRHeadPayload,
  options?: { flushChunk?: () => string },
): ReadableStream<Uint8Array> {
  // `renderStreamEnd()` writes streamed body tags.
  // Manual drivers opt in with `writesBodyTags`.
  streamState(head).writesBodyTags = true
  // Preserve late entries when no custom chunk renderer exists.
  const flushChunk = options?.flushChunk ?? (() => {
    let chunk: string
    try {
      chunk = renderSSRHeadSuspenseChunk(head)
    }
    catch {
      // The response already started. Skip this patch.
      return ''
    }
    if (!chunk)
      return ''
    // A template with no `</head>` never received the bootstrap script.
    return `<script${renderNonceAttribute(head._stream?.nonce)}>window.${getStreamKey(head)}&&(${chunk});document.currentScript.remove()</script>`
  })
  const enc = encoder ??= new TextEncoder()
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  let parts: StreamingTemplateParts | undefined

  return new ReadableStream<Uint8Array>({
    // Async so a failure here rejects into an errored stream instead of
    // throwing synchronously out of the constructor. The reader is acquired
    // before rendering (and released if rendering fails) so a failure at
    // either step leaves `head.entries` intact and the upstream unlocked
    // for retry.
    async start(controller) {
      const activeReader = stream.getReader()
      let prepared: StreamingTemplateParts
      try {
        prepared = prepareStreamingTemplate(head, template, preRenderedState)
      }
      catch (error) {
        activeReader.releaseLock()
        throw error
      }
      reader = activeReader
      parts = prepared
      controller.enqueue(enc.encode(prepared.shell))
    },
    // Read at most one upstream chunk per downstream request so backpressure
    // propagates instead of eagerly draining the app stream.
    async pull(controller) {
      const activeReader = reader
      if (!activeReader)
        return
      let result: ReadableStreamReadResult<Uint8Array>
      try {
        // Keep one microtask before flushing so queued head updates can run.
        result = await activeReader.read().then()
      }
      catch (error) {
        if (activeReader !== reader)
          return
        reader = undefined
        activeReader.releaseLock()
        controller.error(error)
        return
      }
      // Cancel owns teardown once it clears the current reader.
      if (activeReader !== reader)
        return
      if (result.done) {
        reader = undefined
        activeReader.releaseLock()
        const extra = flushChunk?.()
        if (extra)
          controller.enqueue(enc.encode(extra))
        const closing = parts ? renderStreamEnd(head, parts) : ''
        if (closing)
          controller.enqueue(enc.encode(closing))
        controller.close()
        return
      }
      controller.enqueue(result.value)
      const extra = flushChunk?.()
      if (extra)
        controller.enqueue(enc.encode(extra))
    },
    async cancel(reason) {
      const activeReader = reader
      reader = undefined
      if (activeReader) {
        try {
          await activeReader.cancel(reason)
        }
        catch {
          // An errored upstream rejects cancel() with its stored error; the
          // cancelling consumer has already walked away, so swallowing beats
          // surfacing an unhandled rejection.
        }
        activeReader.releaseLock()
      }
    },
  })
}

/**
 * Result from prepareStreamingTemplate containing the shell and end parts
 */
export interface StreamingTemplateParts {
  /**
   * The shell HTML with head tags, htmlAttrs, bodyAttrs, and bootstrap script injected.
   * Write this before streaming app content.
   */
  shell: string
  /**
   * The closing HTML with bodyTags injected before </body>.
   * Write this after streaming app content completes.
   */
  end: string
  /**
   * Offset for streamed body tags within `end`.
   */
  bodyTagsAt?: number
}

interface StreamingTemplateLayout {
  shellTemplate: PreparedHtmlTemplateWithIndexes
  endBeforeBodyTags: string
  endAfterBodyTags: string
}

function createStreamingTemplateLayout(parsed: PreparedHtmlTemplateWithIndexes): StreamingTemplateLayout | undefined {
  const { html, indexes, bodyOutlet } = parsed
  const { bodyTagEnd, bodyCloseTagStart } = indexes
  if (bodyTagEnd < 0 || bodyCloseTagStart < bodyTagEnd)
    return

  // The shell is a prefix of the original document, so its offsets still match.
  return {
    shellTemplate: {
      html: html.slice(0, bodyOutlet?.start ?? bodyTagEnd),
      input: parsed.input,
      indexes: { ...indexes, bodyCloseTagStart: -1 },
    },
    endBeforeBodyTags: html.slice(bodyOutlet?.end ?? bodyTagEnd, bodyCloseTagStart),
    endAfterBodyTags: html.slice(bodyCloseTagStart),
  }
}

function getPreparedStreamingLayout(template: PreparedTemplate): StreamingTemplateLayout | undefined {
  const cache = preparedStreamingLayouts ||= new WeakMap()
  let layout = cache.get(template)
  if (layout === undefined) {
    layout = createStreamingTemplateLayout(template) || null
    if (layout) {
      Object.freeze(layout.shellTemplate.indexes)
      Object.freeze(layout.shellTemplate)
      Object.freeze(layout)
    }
    cache.set(template, layout)
  }
  return layout || undefined
}

/**
 * @experimental
 *
 * Prepares a template for streaming SSR by splitting it at the SSR outlet
 * marker (`<!--app-html-->` / `<!--ssr-outlet-->`) when present, so the
 * streamed app content lands inside the mount container. Falls back to
 * splitting at body tag boundaries when no marker is found.
 *
 * This is the recommended way to handle streaming templates as it:
 * - Uses consistent template parsing (same as transformHtmlTemplateRaw)
 * - Properly injects head content, html/body attrs, and bootstrap script
 * - Injects body tags (scripts at end of body) into the closing part
 *
 * @param head - The Unhead instance
 * @param template - Full HTML template (string or `prepareTemplate()` result)
 * @returns Object with `shell` (before app) and `end` (after app) parts
 *
 * @example
 * ```ts
 * const { shell, end } = prepareStreamingTemplate(head, template)
 * response.write(shell)
 * // ... stream app content ...
 * response.write(end)
 * ```
 */
export function prepareStreamingTemplate(
  head: Unhead<any>,
  template: string | PreparedTemplate,
  preRenderedState?: SSRHeadPayload,
): StreamingTemplateParts {
  const ssr = preRenderedState ?? head.render() as SSRHeadPayload

  const parsed = typeof template === 'string' ? parseHtmlForIndexes(template) : template
  const layout = typeof template === 'string'
    ? createStreamingTemplateLayout(parsed)
    : getPreparedStreamingLayout(template)

  let parts: StreamingTemplateParts
  if (layout) {
    const shell = applyHeadToHtml(layout.shellTemplate, {
      htmlAttrs: ssr.htmlAttrs,
      headTags: createBootstrapScript(getStreamKey(head), head._stream?.nonce) + ssr.headTags,
      bodyAttrs: ssr.bodyAttrs,
      bodyTagsOpen: ssr.bodyTagsOpen,
      bodyTags: '',
    })

    parts = {
      shell,
      end: layout.endBeforeBodyTags + ssr.bodyTags + layout.endAfterBodyTags,
      bodyTagsAt: layout.endBeforeBodyTags.length,
    }
  }
  else {
    // Can't split, return full template as shell
    parts = {
      shell: applyShellToTemplate(head, ssr, parsed),
      end: '',
    }
  }

  // Only clear entries once the shell/end parts have been successfully
  // produced so a template failure leaves them intact for retry.
  if (!preRenderedState) {
    // A supplied payload means all current entries belong to the stream.
    rememberShellBodyTags(head)
    head.entries.clear()
  }
  streamState(head).shellRendered = true
  return parts
}

export { prepareTemplate } from '../parser'
export type { PreparedTemplate } from '../parser'
export type { CreateStreamableServerHeadOptions, HeadTag, SSRHeadPayload, Unhead } from '../types'
