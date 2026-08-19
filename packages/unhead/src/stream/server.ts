import type { PreparedHtmlTemplateWithIndexes, PreparedTemplate } from '../parser'
import type { ServerUnhead } from '../server/createHead'
import type { CreateStreamableServerHeadOptions, HeadTag, ResolvableHead, SSRHeadPayload, Unhead } from '../types'
import { applyHeadToHtml, parseHtmlForIndexes } from '../parser'
import { createHead } from '../server/createHead'
import { dedupeKey, hashTag } from '../utils/dedupe'
import { normalizeEntryToTags, normalizeProps, resolveHeadInput } from '../utils/normalize'
import { DEFAULT_STREAM_KEY } from './client'

const LT_RE = /</g
const GT_RE = />/g
const AMP_RE = /&/g
const SSR_OUTLET_RE = /<!--\s*(?:app-html|ssr-outlet)\s*-->/

// Lazy pure memo (CONTRIBUTING.md side-effects policy): constant-derived,
// stateless, so it can be shared across streams without import-time work.
let encoder: TextEncoder | undefined
let preparedStreamingLayouts: WeakMap<PreparedTemplate, StreamingTemplateLayout | null> | undefined

// Conservative ASCII identifier: must be a safe `window.<name>` accessor.
// Disallows anything that could break out of the dot-notation sink used by
// the bootstrap and suspense-chunk scripts (GHSA-x7mm-9vvv-64w8).
const VALID_STREAM_KEY_RE = /^[$_a-z][$\w]*$/i

function assertValidStreamKey(streamKey: string): void {
  if (typeof streamKey !== 'string' || !VALID_STREAM_KEY_RE.test(streamKey)) {
    throw new Error(
      `[unhead] Invalid streamKey: must be a valid JavaScript identifier matching ${VALID_STREAM_KEY_RE}. `
      + `Received: ${JSON.stringify(streamKey)}`,
    )
  }
}

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
  const { streamKey, writesMarkup, ...rest } = options
  if (streamKey !== undefined)
    assertValidStreamKey(streamKey)
  const head = createHead<T>({
    ...rest,
    experimentalStreamKey: streamKey,
  })
  if (writesMarkup)
    streamState(head).writesMarkup = true

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
  assertValidStreamKey(key)
  return key
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
  assertValidStreamKey(streamKey)
  const nonceAttr = nonce ? ` nonce="${nonce.replace(/"/g, '&quot;')}"` : ''
  // `inline` mode runs the client IIFE above this script, so never clobber an
  // already-installed queue. Doing so drops every streamed patch.
  return `<script${nonceAttr}>window.${streamKey}||(window.${streamKey}={_q:[],push(e){this._q.push(e)}})</script>`
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
 * // ...stream the app, then close it with the tags held back from the chunks
 * res.end(`${renderStreamMarkup(head)}${bodyTags}</body></html>`)
 * ```
 */
export function renderShell(head: Unhead<any, SSRHeadPayload>): SSRHeadPayload {
  const result = head.render()
  rememberShellMarkup(head)
  head.entries.clear()
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
  const parsed = typeof template === 'string' ? parseHtmlForIndexes(template) : template
  const result = applyShellToTemplate(head, head.render() as SSRHeadPayload, parsed)
  // Only clear entries once the shell has been successfully produced so a
  // template failure leaves them intact for retry.
  head.entries.clear()
  return result
}

/**
 * Injects the bootstrap script and full head payload into a whole template.
 * Shared by renderSSRHeadShell and prepareStreamingTemplate's no-split fallback.
 */
function applyShellToTemplate(head: Unhead<any>, ssr: SSRHeadPayload, parsed: ReturnType<typeof parseHtmlForIndexes>): string {
  return applyHeadToHtml(parsed, {
    htmlAttrs: ssr.htmlAttrs,
    headTags: createBootstrapScript(getStreamKey(head)) + ssr.headTags,
    bodyAttrs: ssr.bodyAttrs,
    bodyTags: ssr.bodyTags,
  })
}

/**
 * A tag whose job depends on being in the served `<head>`.
 *
 * A crawler reads the HTML the server sent. It does not run the streaming
 * patch script, so a tag delivered that way never reaches it.
 */
const BOT_HEAD_META_NAMES = /* @__PURE__ */ new Set(['description', 'robots', 'googlebot', 'keywords'])
const BOT_HEAD_LINK_RELS = /* @__PURE__ */ new Set(['canonical', 'alternate', 'amphtml', 'prev', 'next', 'author', 'license'])
const BOT_HEAD_META_PREFIX_RE = /^(?:og|twitter|article|book|profile|fb|al):/
const WHITESPACE_RE = /\s+/

function isHiddenFromBots(tag: HeadTag): boolean {
  const props = tag.props
  // Search engines read JSON-LD anywhere in the document, but only when it is
  // in the HTML they were served. Position does not rescue it, so this is
  // checked before the body exemption below.
  if (tag.tag === 'script')
    return String(props.type || '').toLowerCase() === 'application/ld+json'
  // Every other tag here only carries meaning from the head, so one placed in
  // the body was never going to be read.
  if (tag.tagPosition?.startsWith('body'))
    return false
  switch (tag.tag) {
    case 'title':
    case 'titleTemplate':
    case 'base':
      return true
    case 'meta': {
      const name = String(props.name || '').toLowerCase()
      if (BOT_HEAD_META_NAMES.has(name))
        return true
      const property = String(props.property || props.name || '').toLowerCase()
      return BOT_HEAD_META_PREFIX_RE.test(property)
    }
    case 'link':
      // `rel` is a space-separated token list, and HTML allows any ASCII
      // whitespace between tokens.
      return String(props.rel || '').toLowerCase().split(WHITESPACE_RE).some(rel => BOT_HEAD_LINK_RELS.has(rel))
    default:
      return false
  }
}

/**
 * @experimental
 *
 * What the next {@link renderSSRHeadSuspenseChunk} call will hand to the
 * client, before it renders and clears anything.
 */
export interface StreamedTagsReport {
  /**
   * Every entry that has not been flushed yet, normalized to tags. Entry
   * options are applied, so `tagPosition` tells you whether a tag was bound
   * for the head or the body.
   */
  pendingTags: HeadTag[]
  /**
   * The subset of `pendingTags` that only works when it is in the served
   * `<head>`.
   *
   * A bot reads the HTML the server sent. It does not run the streaming patch
   * script, so it never sees these: `<title>`, canonical and alternate links,
   * robots and description meta, Open Graph and Twitter cards, JSON-LD.
   */
  tagsHiddenFromBots: HeadTag[]
}

/**
 * @experimental
 *
 * Inspects the entries that have not been flushed yet, without rendering or
 * clearing them.
 *
 * Once the shell `<head>` is on the wire, pending entries can only be
 * delivered as client-side patches. Use this to see what the next
 * `renderSSRHeadSuspenseChunk()` will defer, and to warn when a tag that
 * needs to be in the served HTML will not be.
 *
 * Tags are normalized fresh on every call and are never cached, so mutating
 * them cannot affect a later render.
 *
 * @param head - The Unhead instance
 * @returns The pending tags, and the subset a crawler will not see
 *
 * @example
 * ```ts
 * const { tagsHiddenFromBots } = inspectStreamedTags(head)
 * if (tagsHiddenFromBots.length) {
 *   console.warn(`Bots will not see: ${tagsHiddenFromBots.map(t => t.tag).join(', ')}`)
 * }
 * const chunk = renderSSRHeadSuspenseChunk(head)
 * ```
 */
export function inspectStreamedTags(head: Unhead<any>): StreamedTagsReport {
  const propResolvers = head.resolvedOptions.propResolvers || []
  const pendingTags: HeadTag[] = []
  const tagsHiddenFromBots: HeadTag[] = []
  for (const entry of head.entries.values()) {
    const entryTags = normalizeEntryToTags(entry.input, propResolvers)
    for (const tag of entryTags) {
      if (entry.options)
        Object.assign(tag, entry.options)
      pendingTags.push(tag)
      if (isHiddenFromBots(tag))
        tagsHiddenFromBots.push(tag)
    }
  }
  return { pendingTags, tagsHiddenFromBots }
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

/** Per-response streaming state. Created on first use, never on a cold head. */
function streamState(head: Unhead<any>) {
  return (head._stream ||= {})
}

/**
 * Tags that reach the page better as body markup than as a client patch.
 *
 * - `noscript` only ever renders for a client that does not run the patch
 *   script, so a patched `noscript` reaches nobody.
 * - An explicit body position is already a request for markup.
 * - Search engines read `application/ld+json` anywhere in the document.
 *
 * Everything else in a streamed patch only works from the head, and only for
 * clients that run the script.
 */
function isMarkupTag(tagName: string, tag: any, entryPosition?: string): boolean {
  if (!tag || typeof tag !== 'object')
    return false
  if (tagName === 'noscript')
    return true
  // `useHead(input, { tagPosition })` applies to every tag in the entry, so a
  // tag with no position of its own inherits it, the way `resolveTags` does.
  const position = tag.tagPosition ?? entryPosition
  if (position === 'bodyClose' || position === 'bodyOpen')
    return true
  return tagName === 'script' && typeof tag.type === 'string' && JSON_LD_TYPE_RE.test(tag.type)
}

/**
 * Identity for a tag bound for markup, in the same terms the DOM renderer and
 * `resolveTags` use. `dedupeKey` names the slot a tag occupies, keyed or
 * semantic, and `hashTag` fingerprints its content.
 */
function markupIdentity(tagName: string, tag: any): { slot: string, content: string } {
  // Copied because `normalizeProps` writes `type` back onto an object payload.
  const normalized = normalizeProps({ tag: tagName as HeadTag['tag'], props: {} } as HeadTag, { ...tag })
  const content = hashTag(normalized)
  return { slot: dedupeKey(normalized) || content, content }
}

/** Mirrors `normalizeEntryToTags`: an entry may be a function of its input. */
function unwrapEntryInput(input: any): any {
  return typeof input === 'function' ? input() : input
}

/**
 * Records the markup-bound tags the shell already rendered, so a later chunk
 * repeating one of them does not emit a second copy.
 */
function rememberShellMarkup(head: Unhead<any>): void {
  const seen = streamState(head).seen ||= new Set<string>()
  const propResolvers = head.resolvedOptions.propResolvers || []
  for (const entry of head.entries.values()) {
    const raw: any = unwrapEntryInput(entry.input)
    if (!raw || typeof raw !== 'object')
      continue
    const entryPosition = (entry.options as any)?.tagPosition
    // Every entry resolves. A shape test on the raw input cannot stand in for
    // one: an entry given as a function has no tag arrays until it resolves,
    // and skipping it loses what the shell served.
    const input: any = resolveHeadInput(raw, propResolvers)
    for (const key in input) {
      const value = input[key]
      if (!Array.isArray(value))
        continue
      for (const tag of value) {
        if (!isMarkupTag(key, tag, entryPosition))
          continue
        // Both, so a later chunk can tell an exact repeat from an update to a
        // tag whose head bytes have already gone out.
        const id = markupIdentity(key, tag)
        seen.add(id.content)
        seen.add(id.slot)
      }
    }
  }
}

/**
 * Splits a resolved head input into the part that must go out as a client
 * patch and the part that can go out as body markup instead. Returns
 * `undefined` for a side that has nothing in it.
 */
function splitMarkupTags(input: any, seen: Set<string>, keepFallback: boolean, entryPosition?: string): { patch?: any, markup?: any } {
  if (!input || typeof input !== 'object')
    return { patch: input }

  let patch: any
  let markup: any
  for (const key in input) {
    const value = input[key]
    if (!Array.isArray(value) || !value.some(tag => isMarkupTag(key, tag, entryPosition)))
      continue
    const rest: any[] = []
    const carried: any[] = []
    for (const tag of value) {
      if (!isMarkupTag(key, tag, entryPosition)) {
        rest.push(tag)
        continue
      }
      const id = markupIdentity(key, tag)
      // A repeat of something the shell already served goes out nowhere.
      if (seen.has(id.content))
        continue
      // The shell filled this slot already. Sending markup would put a second
      // copy in the HTML, so the patch updates the first one instead.
      if (seen.has(id.slot)) {
        rest.push(tag)
        continue
      }
      seen.add(id.content)
      carried.push(tag)
      // A driver that never writes the tail would otherwise lose this tag. The
      // patch recreates it, and the client adopts the served markup when the
      // tail did land, so it is never rendered twice.
      if (keepFallback)
        rest.push(tag)
    }
    patch ||= { ...input }
    if (rest.length)
      patch[key] = rest
    else
      delete patch[key]
    if (carried.length)
      (markup ||= {})[key] = carried
  }

  if (!patch)
    return { patch: input }
  // An entry carrying nothing but markup tags leaves no patch behind at all.
  const hasPatch = Object.keys(patch).some(k => patch[k] !== undefined)
  return { patch: hasPatch ? patch : undefined, markup }
}

/**
 * Renders the tags held back from earlier chunks as body markup, and clears
 * them. Drive a stream by hand and you must write this before `</body>`, or
 * the held-back tags never reach the page. `renderStreamEnd()` does it for
 * you when you stream from a template.
 */
export function renderStreamMarkup(head: Unhead<any>): string {
  const held = streamState(head).markup
  if (!held?.length) {
    return ''
  }

  // Re-pushed through the real head so the tags get the same normalization,
  // dedupe, and escaping as any other server-rendered tag.
  const restore = new Map(head.entries)
  head.entries.clear()
  try {
    for (const input of held) {
      // The body-open slot flushed with the shell, so everything held lands at
      // the close. A `bodyOpen` tag is relocated, not dropped.
      const forced: any = {}
      for (const key in input)
        forced[key] = input[key].map((t: any) => ({ ...t, tagPosition: 'bodyClose' }))
      head.push(forced)
    }
    const bodyTags = (head.render() as SSRHeadPayload).bodyTags
    // Only after the render succeeds, so a failure leaves the markup for a retry.
    streamState(head).markup = undefined
    return bodyTags
  }
  finally {
    head.entries.clear()
    for (const [k, v] of restore)
      head.entries.set(k, v)
  }
}

/**
 * Builds the closing HTML for a stream, folding in any tags that were held
 * back from the patch scripts.
 *
 * Drive a stream by hand and you must write this instead of `parts.end`, or
 * the held-back tags never reach the page.
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
  const tail = renderStreamMarkup(head)
  if (!tail)
    return parts.end
  const at = parts.bodyTagsAt ?? parts.end.length
  return parts.end.slice(0, at) + tail + parts.end.slice(at)
}

export function renderSSRHeadSuspenseChunk(head: Unhead<any>): string {
  if (!head.entries.size)
    return ''

  const streamKey = getStreamKey(head)
  const propResolvers = head.resolvedOptions.propResolvers || []
  // Resolve and serialize before clearing so a failure leaves the valid
  // entries intact for the next chunk.
  let serialized: string
  let patchCount = 0
  try {
    const seen = streamState(head).seen ||= new Set<string>()
    const entries = Array.from(head.entries.values())
    const entryPositions = entries.map(e => (e.options as any)?.tagPosition as string | undefined)
    const resolved = entries.map(e => resolveHeadInput(unwrapEntryInput(e.input), propResolvers))
    const inputs: any[] = []
    const markup: any[] = []
    for (let i = 0; i < resolved.length; i++) {
      const input = resolved[i]
      const split = splitMarkupTags(input, seen, !streamState(head).writesMarkup, entryPositions[i])
      if (split.patch)
        inputs.push(split.patch)
      if (split.markup)
        markup.push(split.markup)
    }
    serialized = safeJsonStringify(inputs)
    patchCount = inputs.length
    if (markup.length) {
      (streamState(head).markup ||= []).push(...markup)
    }
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
  head.entries.clear()
  // Every pending tag went out as markup, so this chunk
  // needs no script at all.
  if (!patchCount)
    return ''
  return `window.${streamKey}.push(${serialized})`
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
  // This wrapper always writes `renderStreamEnd`, so markup tags need no
  // patch fallback. A hand-rolled driver promises the same with the
  // `writesMarkup` option.
  streamState(head).writesMarkup = true
  // Without a default, entries registered after the shell are discarded.
  const flushChunk = options?.flushChunk ?? (() => {
    let chunk: string
    try {
      chunk = renderSSRHeadSuspenseChunk(head)
    }
    catch {
      // Bytes are already on the wire; a throw here truncates the response.
      return ''
    }
    if (!chunk)
      return ''
    // A template with no `</head>` never received the bootstrap script.
    return `<script>window.${getStreamKey(head)}&&(${chunk});document.currentScript.remove()</script>`
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
      const result = await activeReader.read().then(
        value => ({ ok: true as const, value }),
        (error: unknown) => ({ ok: false as const, error }),
      )
      // cancel() won the race mid-read; it owns the reader teardown and the
      // cancelled controller must not be touched.
      if (activeReader !== reader)
        return
      if (!result.ok) {
        reader = undefined
        activeReader.releaseLock()
        controller.error(result.error)
        return
      }
      if (result.value.done) {
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
      controller.enqueue(result.value.value)
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
   * Offset within `end` where body-close tags sit. Content inserted here stays
   * a direct child of `<body>`, which is what the client DOM renderer scans
   * when it adopts server-rendered tags.
   */
  bodyTagsAt?: number
}

interface StreamingTemplateLayout {
  shellTemplate: PreparedHtmlTemplateWithIndexes
  endBeforeBodyTags: string
  endAfterBodyTags: string
}

function createStreamingTemplateLayout(parsed: PreparedHtmlTemplateWithIndexes): StreamingTemplateLayout | undefined {
  const html = parsed.html
  const bodyEnd = parsed.indexes.bodyTagEnd
  const bodyCloseStart = parsed.indexes.bodyCloseTagStart
  if (bodyEnd < 0 || bodyCloseStart < 0)
    return

  const bodyInterior = html.substring(bodyEnd, bodyCloseStart)
  // Prefer splitting at a Vite-style SSR outlet marker so the streamed app
  // content lands inside the container (e.g. `<div id="app">`) that the
  // client mounts onto. Falls back to splitting at the <body> tag, which
  // preserves any static body interior after the stream.
  const markerMatch = bodyInterior.match(SSR_OUTLET_RE)

  let beforeStream: string
  let afterStream: string
  if (markerMatch) {
    beforeStream = bodyInterior.substring(0, markerMatch.index!)
    afterStream = bodyInterior.substring(markerMatch.index! + markerMatch[0].length)
  }
  else {
    beforeStream = ''
    afterStream = bodyInterior
  }

  const shellPart = html.substring(0, bodyEnd) + beforeStream
  const endPart = html.substring(bodyCloseStart)

  // Derive the indexes that parsing the synthetic shell would produce without
  // re-scanning the template. When `bodyCloseStart >= bodyEnd` (any sane
  // template), `shellPart` is a prefix of `html`, so a first
  // occurrence that fits entirely inside it carries over unchanged.
  let shellTemplate: PreparedHtmlTemplateWithIndexes
  if (bodyCloseStart >= bodyEnd) {
    const shellLen = shellPart.length
    const { htmlTagStart, headTagEnd, bodyTagStart } = parsed.indexes
    const shellHtmlTagStart = (htmlTagStart >= 0 && htmlTagStart + 5 <= shellLen) ? htmlTagStart : -1
    let shellHtmlTagEnd = -1
    if (shellHtmlTagStart >= 0) {
      const gt = shellPart.indexOf('>', shellHtmlTagStart)
      // No '>' before the suffix: the first one is the '>' closing '</body>'.
      shellHtmlTagEnd = gt >= 0 ? gt + 1 : shellLen + 7
    }
    shellTemplate = {
      html: `${shellPart}</body></html>`,
      input: parsed.input,
      indexes: {
        htmlTagStart: shellHtmlTagStart,
        htmlTagEnd: shellHtmlTagEnd,
        headTagEnd: (headTagEnd >= 0 && headTagEnd + 7 <= shellLen) ? headTagEnd : -1,
        // <body> is always fully inside the prefix in this branch.
        bodyTagStart,
        bodyTagEnd: bodyEnd,
        bodyCloseTagStart: (bodyCloseStart + 7 <= shellLen) ? bodyCloseStart : shellLen,
      },
    }
  }
  else {
    // Degenerate template ('</body>' before '<body>'): `substring` swapped
    // its arguments so `shellPart` is not a prefix of `html`.
    shellTemplate = parseHtmlForIndexes(`${shellPart}</body></html>`)
  }

  return {
    shellTemplate,
    endBeforeBodyTags: afterStream,
    endAfterBodyTags: endPart,
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
      headTags: createBootstrapScript(getStreamKey(head)) + ssr.headTags,
      bodyAttrs: ssr.bodyAttrs,
      bodyTags: '',
    }).replace('</body></html>', '')

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
    // A caller supplying its own payload rendered the shell earlier, so its
    // entries are gone and anything left belongs to the stream.
    rememberShellMarkup(head)
    head.entries.clear()
  }
  return parts
}

export { prepareTemplate } from '../parser'
export type { PreparedTemplate } from '../parser'
export type { CreateStreamableServerHeadOptions, HeadTag, SSRHeadPayload, Unhead } from '../types'
