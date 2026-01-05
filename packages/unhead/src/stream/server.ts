import type { CreateStreamableServerHeadOptions, ResolvableHead, SSRHeadPayload, Unhead } from '../types'
import { applyHeadToHtml, parseHtmlForIndexes } from '../parser'
import { createHead } from '../server/createHead'
import { DEFAULT_STREAM_KEY } from './client'

export * from '../server'
export { DEFAULT_STREAM_KEY }

/**
 * Base context with just the head instance.
 * Extended by framework-specific contexts.
 */
export interface BaseStreamableHeadContext<T = ResolvableHead> {
  /**
   * The Unhead instance to provide to your framework
   */
  head: Unhead<T>
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
   * @param template - The HTML template
   * @returns A new ReadableStream with shell and closing HTML included
   */
  wrapStream: (stream: ReadableStream<Uint8Array>, template: string) => ReadableStream<Uint8Array>
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
  const { streamKey, ...rest } = options
  const head = createHead<T>({
    ...rest,
    experimentalStreamKey: streamKey,
  })

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
  return head.resolvedOptions.experimentalStreamKey || DEFAULT_STREAM_KEY
}

/**
 * Generates the bootstrap script that creates the streaming queue on the window object.
 * This script is injected into the shell and must run before any streaming updates.
 */
function createBootstrapScript(streamKey: string): string {
  return `<script>window.${streamKey}={_q:[],push(e){this._q.push(e)}}</script>`
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
 * const shell = renderSSRHeadShell(head, template)
 * ```
 */
export function renderSSRHeadShell(head: Unhead<any>, template: string): string {
  const ssr = head.render() as SSRHeadPayload
  head.entries.clear()
  const bootstrapScript = createBootstrapScript(getStreamKey(head))

  // Use parser utilities for consistent template handling
  const parsed = parseHtmlForIndexes(template)
  return applyHeadToHtml(parsed, {
    htmlAttrs: ssr.htmlAttrs,
    headTags: bootstrapScript + ssr.headTags,
    bodyAttrs: ssr.bodyAttrs,
    bodyTags: ssr.bodyTags,
  })
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
 * @param template - Full HTML template with an app placeholder
 * @param placeholder - The placeholder marking where app content goes (default: '<!--app-html-->')
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
  template: string,
  placeholder = '<!--app-html-->',
  preRenderedState?: SSRHeadPayload,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const { shell, end } = prepareStreamingTemplate(head, template, placeholder, preRenderedState)
        controller.enqueue(encoder.encode(shell))

        const reader = stream.getReader()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done)
              break
            controller.enqueue(value)
          }
        }
        finally {
          reader.releaseLock()
        }

        controller.enqueue(encoder.encode(end))
        controller.close()
      }
      catch (error) {
        controller.error(error)
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
}

/**
 * @experimental
 *
 * Prepares a template for streaming SSR by splitting it at the app placeholder
 * and injecting head content into both parts.
 *
 * This is the recommended way to handle streaming templates as it:
 * - Uses consistent template parsing (same as transformHtmlTemplateRaw)
 * - Properly injects head content, html/body attrs, and bootstrap script
 * - Injects body tags (scripts at end of body) into the closing part
 *
 * @param head - The Unhead instance
 * @param template - Full HTML template with an app placeholder
 * @param placeholder - The placeholder marking where app content goes (default: '<!--app-html-->')
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
  template: string,
  placeholder = '<!--app-html-->',
  preRenderedState?: SSRHeadPayload,
): StreamingTemplateParts {
  // Use pre-rendered state if provided (Vue captures before render), otherwise render now
  const ssr = preRenderedState ?? head.render() as SSRHeadPayload
  if (!preRenderedState) {
    head.entries.clear()
  }
  const bootstrapScript = createBootstrapScript(getStreamKey(head))

  // Find the placeholder
  const placeholderIdx = template.indexOf(placeholder)
  if (placeholderIdx === -1) {
    // Fallback: use body tag positions from parser
    const parsed = parseHtmlForIndexes(template)
    const bodyEnd = parsed.indexes.bodyTagEnd
    const bodyCloseStart = parsed.indexes.bodyCloseTagStart

    if (bodyEnd >= 0 && bodyCloseStart >= 0) {
      const shellPart = template.substring(0, bodyEnd)
      const endPart = template.substring(bodyCloseStart)

      const shellParsed = parseHtmlForIndexes(`${shellPart}</body></html>`)
      const shell = applyHeadToHtml(shellParsed, {
        htmlAttrs: ssr.htmlAttrs,
        headTags: bootstrapScript + ssr.headTags,
        bodyAttrs: ssr.bodyAttrs,
        bodyTags: '',
      }).replace('</body></html>', '')

      return {
        shell,
        end: ssr.bodyTags + endPart,
      }
    }

    // Can't split, return full template as shell
    const parsed2 = parseHtmlForIndexes(template)
    return {
      shell: applyHeadToHtml(parsed2, {
        htmlAttrs: ssr.htmlAttrs,
        headTags: bootstrapScript + ssr.headTags,
        bodyAttrs: ssr.bodyAttrs,
        bodyTags: ssr.bodyTags,
      }),
      end: '',
    }
  }

  // Split at placeholder
  const shellPart = template.substring(0, placeholderIdx)
  const endPart = template.substring(placeholderIdx + placeholder.length)

  // Parse and apply head to shell part
  // We need to add fake closing tags for the parser to work correctly
  const shellWithClosing = `${shellPart}</body></html>`
  const shellParsed = parseHtmlForIndexes(shellWithClosing)
  const shell = applyHeadToHtml(shellParsed, {
    htmlAttrs: ssr.htmlAttrs,
    headTags: bootstrapScript + ssr.headTags,
    bodyAttrs: ssr.bodyAttrs,
    bodyTags: '',
  }).replace('</body></html>', '')

  // Parse end part and inject body tags
  const endParsed = parseHtmlForIndexes(`<html><head></head><body>${endPart}`)
  const endWithBodyTags = applyHeadToHtml(endParsed, {
    htmlAttrs: '',
    headTags: '',
    bodyAttrs: '',
    bodyTags: ssr.bodyTags,
  }).replace('<html><head></head><body>', '')

  return {
    shell,
    end: endWithBodyTags,
  }
}

export type { CreateStreamableServerHeadOptions, SSRHeadPayload, Unhead } from '../types'
