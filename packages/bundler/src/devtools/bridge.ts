import type { SeoOverview, SerializedScript, SerializedTag, SerializedValidationRule, TagRenderMode, UnheadDevtoolsState } from './rpc/types'

const __UNHEAD_VERSION__ = '' // replaced at serve-time by the Vite plugin

declare global {
  interface Window {
    __unhead__?: {
      _head?: any
      _q?: any[]
      push?: (e: any) => void
    }
    __unhead_devtools__?: any
  }
}

function extractSeoOverview(tags: SerializedTag[], title: string): SeoOverview {
  const seo: SeoOverview = {
    title,
    description: '',
    canonical: '',
    robots: '',
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
  }
  for (const t of tags) {
    if (t.tag === 'meta') {
      const name = t.props.name
      const property = t.props.property
      const content = t.props.content || ''
      if (name === 'description')
        seo.description = content
      else if (name === 'robots')
        seo.robots = content
      else if (property === 'og:title')
        seo.ogTitle = content
      else if (property === 'og:description')
        seo.ogDescription = content
      else if (property === 'og:image')
        seo.ogImage = content
    }
    else if (t.tag === 'link' && t.props.rel === 'canonical') {
      seo.canonical = t.props.href || ''
    }
  }
  return seo
}

/**
 * Serializes a value preserving type information for non-serializable types.
 * Functions become "ƒ functionName()", null stays null, undefined becomes "⊘ undefined".
 */
function safeSerialize(value: any, seen = new WeakSet()): any {
  if (value === null)
    return null
  if (value === undefined)
    return '⊘ undefined'
  if (typeof value === 'function')
    return `ƒ ${value.name || 'anonymous'}()`
  if (typeof value === 'symbol')
    return `Symbol(${value.description || ''})`
  if (typeof value !== 'object')
    return value
  if (seen.has(value))
    return '⊘ circular'
  seen.add(value)
  if (Array.isArray(value))
    return value.map(v => safeSerialize(v, seen))
  const result: Record<string, any> = {}
  for (const key in value) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype')
      continue
    result[key] = safeSerialize(value[key], seen)
  }
  return result
}

function resolveEntryMode(entry: any, wasSSR: boolean, ssrSources: Set<string>, wasStreamed: boolean): TagRenderMode {
  if (entry._devtoolsMode)
    return entry._devtoolsMode
  // Entries pushed via the streaming queue (window.__unhead__.push) are
  // tagged by the streaming IIFE so they can be distinguished from regular
  // hydrated/client entries.
  if (entry._streamed)
    return 'stream'
  // In streaming mode, the SSR payload script is absent, so we can't match
  // sources against an ssrSources set. Any entry that arrived via useHead
  // (i.e. has a source) is hydrating a tag that was first painted by the
  // streaming inline scripts, so treat it as hydrated.
  if (wasStreamed && entry.options?._source)
    return 'hydrated'
  if (!wasSSR)
    return 'client'
  // Match against SSR payload sources to determine if this entry was server-rendered
  const source = entry.options?._source
  if (source && ssrSources.has(source))
    return 'hydrated'
  return 'client'
}

function readSSRDevtoolsPayload(): { entries: any[], tags?: any[] } | null {
  const el = document.head.querySelector('script[id="unhead:devtools"]')
  if (!el?.innerHTML)
    return null
  try {
    return JSON.parse(el.innerHTML)
  }
  catch {
    return null
  }
}

function serializeHeadState(head: any, wasSSR = false, ssrPayload: { entries: any[], tags?: any[] } | null = null): UnheadDevtoolsState {
  const entries: UnheadDevtoolsState['entries'] = []
  const allTags: UnheadDevtoolsState['tags'] = []
  const tagTypeCounts: Record<string, number> = {}
  const weightFn = head.resolvedOptions?._tagWeight || ((tag: any) => typeof tag.tagPriority === 'number' ? tag.tagPriority : 100)

  // Build set of sources that existed on the server
  const ssrSources = new Set<string>()
  if (ssrPayload?.entries) {
    for (const e of ssrPayload.entries) {
      if (e.source)
        ssrSources.add(e.source)
    }
  }

  // Detect streaming mode by looking for any entry tagged by the IIFE.
  // When streaming, useHead pushes during hydration are real client entries
  // hydrating tags that the streaming inline scripts already painted.
  let wasStreamed = false
  if (head.entries) {
    for (const [, entry] of head.entries) {
      if (entry._streamed) {
        wasStreamed = true
        break
      }
    }
  }

  // Collect client entry IDs to find server-only entries
  const clientEntryIds = new Set<number>()

  if (head.entries) {
    for (const [id, entry] of head.entries) {
      clientEntryIds.add(id)
      const tags = entry._tags || []
      const mode = resolveEntryMode(entry, wasSSR, ssrSources, wasStreamed)
      entries.push({
        id,
        source: entry.options?._source,
        input: safeSerialize(entry.input || {}),
        tagCount: tags.length,
        mode,
      })
      for (const tag of tags) {
        const tagName = tag.tag
        tagTypeCounts[tagName] = (tagTypeCounts[tagName] || 0) + 1
        const weight = tag._w ?? weightFn(tag)
        allTags.push({
          tag: tagName,
          props: { ...tag.props },
          innerHTML: tag.innerHTML,
          textContent: tag.textContent,
          position: tag.tagPosition,
          priority: weight,
          order: tag._p,
          dedupeKey: tag._d,
          source: tag._source || entry.options?._source,
          mode,
        })
      }
    }
  }

  // Patch JSON-LD tags with resolved innerHTML from the DOM.
  // The schema-org plugin sets innerHTML during tags:resolve which operates
  // on copies, so entry._tags never receives it.
  for (const el of document.querySelectorAll('script[type="application/ld+json"]')) {
    if (el.id === 'unhead:devtools' || el.id === 'unhead:payload')
      continue
    const innerHTML = el.innerHTML
    if (!innerHTML)
      continue
    // Find the matching serialized tag and patch it
    const dedupeKey = el.getAttribute('data-hid') || ''
    const matched = allTags.find(
      t => t.tag === 'script' && t.props.type === 'application/ld+json' && !t.innerHTML
        && (dedupeKey ? (t.dedupeKey?.includes(dedupeKey) || t.props['data-hid'] === dedupeKey) : true),
    )
    if (matched) {
      matched.innerHTML = innerHTML
    }
    else {
      // DOM has a JSON-LD script not in entry._tags (e.g. fully plugin-managed)
      allTags.push({
        tag: 'script',
        props: { type: 'application/ld+json', ...(dedupeKey ? { 'data-hid': dedupeKey } : {}) },
        innerHTML,
        mode: 'client' as TagRenderMode,
      } as any)
      tagTypeCounts.script = (tagTypeCounts.script || 0) + 1
    }
  }

  // Merge server-only data from SSR payload
  if (ssrPayload) {
    // Server-only entries
    if (ssrPayload.entries) {
      for (const ssrEntry of ssrPayload.entries) {
        if (!clientEntryIds.has(ssrEntry.id)) {
          entries.push({
            id: ssrEntry.id,
            source: ssrEntry.source,
            input: ssrEntry.input || {},
            tagCount: ssrEntry.tagCount,
            mode: 'server' as TagRenderMode,
          })
        }
      }
    }
    // Server-only tags (not present in client)
    if (ssrPayload.tags) {
      const tagFingerprint = (t: any) => t.dedupeKey || `${t.tag}:${JSON.stringify(t.props || {})}`
      const clientTagKeys = new Set(allTags.map(t => tagFingerprint(t)))
      for (const ssrTag of ssrPayload.tags) {
        if (clientTagKeys.has(tagFingerprint(ssrTag)))
          continue
        const tagName = ssrTag.tag
        tagTypeCounts[tagName] = (tagTypeCounts[tagName] || 0) + 1
        allTags.push({
          tag: tagName,
          props: ssrTag.props || {},
          innerHTML: ssrTag.innerHTML,
          textContent: ssrTag.textContent,
          position: ssrTag.position,
          priority: ssrTag.priority,
          dedupeKey: ssrTag.dedupeKey,
          source: ssrTag.source,
          mode: 'server' as TagRenderMode,
        })
      }
    }
  }

  const plugins: string[] = []
  if (head.plugins) {
    for (const [key] of head.plugins) {
      plugins.push(key)
    }
  }

  const scripts: SerializedScript[] = []
  if (head._scripts) {
    for (const [id, script] of Object.entries(head._scripts)) {
      const s = script as any
      scripts.push({
        id,
        src: s.src || s.input?.src || '',
        status: s.status || 'unknown',
        warmupStrategy: s._warmupEl ? (s._warmupStrategy || 'preload') : undefined,
        events: s._events || [],
        fetchpriority: s.input?.fetchpriority,
        crossorigin: s.input?.crossorigin,
        defer: s.input?.defer,
        async: s.input?.async,
      })
    }
  }

  let templateParams: Record<string, any> | null = null
  if (head._templateParams) {
    try {
      templateParams = JSON.parse(JSON.stringify(head._templateParams))
    }
    catch {}
  }

  const title = head._title || document.title || ''

  // Read validation rules stored by ValidatePlugin (if active)
  const validationRules: SerializedValidationRule[] = (head._validationRules || []).map((r: any) => ({
    id: r.id,
    message: r.message,
    severity: r.severity,
    source: r.source,
    tagDedupeKey: r.tag?._d || r.tag?._h || undefined,
  }))

  return {
    version: __UNHEAD_VERSION__,
    entries,
    tags: allTags.sort((a, b) => (a.priority ?? 100) === (b.priority ?? 100) ? (a.order ?? 0) - (b.order ?? 0) : (a.priority ?? 100) - (b.priority ?? 100)),
    plugins,
    title,
    scripts,
    seo: extractSeoOverview(allTags, title),
    titleTemplate: head._titleTemplate
      ? (typeof head._titleTemplate === 'function' ? String(head._titleTemplate) : head._titleTemplate)
      : null,
    templateParams,
    separator: head._separator || '|',
    ssr: !!head.ssr,
    dirty: !!head.dirty,
    domElementCount: head._dom?._e?.size || 0,
    tagTypeCounts,
    validationRules,
  }
}

function detectSSR(): boolean {
  // Check if the page has server-rendered head elements (meta/link with content)
  const headEl = document.head
  return !!(
    headEl.querySelector('meta[name="description"]')
    || headEl.querySelector('meta[property]')
    || headEl.querySelector('link[rel="canonical"]')
    || headEl.querySelector('script[id="unhead:payload"]')
  )
}

function connectBridge(head: any) {
  let sharedState: any

  const wasSSR = detectSSR()
  const ssrPayload = readSSRDevtoolsPayload()

  function syncToSharedState() {
    if (!sharedState)
      return
    const newState = serializeHeadState(head, wasSSR, ssrPayload)
    sharedState.mutate((draft: any) => {
      Object.assign(draft, newState)
    })
  }

  async function init() {
    const { getDevToolsClientContext } = await import('@vitejs/devtools-kit/client')

    // Retry until DevTools client context is available
    let ctx = getDevToolsClientContext()
    if (!ctx) {
      let retries = 0
      await new Promise<void>((resolve) => {
        const timer = globalThis.setInterval(() => {
          ctx = getDevToolsClientContext()
          if (ctx || ++retries > 50) {
            globalThis.clearInterval(timer)
            if (!ctx)
              console.warn('[unhead bridge] gave up waiting for DevTools context after 50 retries')
            resolve()
          }
        }, 100)
      })
    }
    if (!ctx) {
      console.warn('[unhead bridge] no DevTools client context, aborting')
      return
    }

    sharedState = await (ctx.rpc.sharedState as any).get('unhead:state', {
      initialValue: serializeHeadState(head, wasSSR, ssrPayload),
    })

    if (head.hooks)
      head.hooks.hook('dom:rendered', syncToSharedState)

    // Initial sync after a short delay to capture early entries
    setTimeout(syncToSharedState, 500)
  }

  init().catch((err) => {
    console.error('[unhead bridge] init failed:', err)
  })
}

function findHead(): any {
  // 1. Streaming plugin pattern: window.__unhead__._head
  if (window.__unhead__?._head)
    return window.__unhead__._head

  // 2. Devtools-exposed pattern: window.__unhead_devtools__
  if (window.__unhead_devtools__)
    return window.__unhead_devtools__

  return null
}

function pollForHead() {
  let attempts = 0
  const handle = globalThis.setInterval(() => {
    const h = findHead()
    if (h) {
      globalThis.clearInterval(handle)
      connectBridge(h)
    }
    if (++attempts > 50) {
      globalThis.clearInterval(handle)
      console.warn('[unhead bridge] gave up polling for head after 50 attempts')
    }
  }, 100)
}

if (typeof window !== 'undefined') {
  const head = findHead()
  if (head) {
    connectBridge(head)
  }
  else {
    pollForHead()
  }
}
