import type { SeoOverview, SerializedScript, SerializedTag, SerializedValidationRule, UnheadDevtoolsState } from './rpc/types'

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

function serializeHeadState(head: any): UnheadDevtoolsState {
  const entries: UnheadDevtoolsState['entries'] = []
  const allTags: UnheadDevtoolsState['tags'] = []
  const tagTypeCounts: Record<string, number> = {}

  if (head.entries) {
    for (const [id, entry] of head.entries) {
      const tags = entry._tags || []
      entries.push({
        id,
        source: entry.options?._source,
        input: JSON.parse(JSON.stringify(entry.input || {})),
        tagCount: tags.length,
      })
      for (const tag of tags) {
        const tagName = tag.tag
        tagTypeCounts[tagName] = (tagTypeCounts[tagName] || 0) + 1
        allTags.push({
          tag: tagName,
          props: { ...tag.props },
          innerHTML: tag.innerHTML,
          textContent: tag.textContent,
          position: tag.tagPosition,
          priority: tag._w,
          dedupeKey: tag._d,
          source: tag._source || entry.options?._source,
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
  }))

  return {
    entries,
    tags: allTags,
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

function connectBridge(head: any) {
  let sharedState: any

  function syncToSharedState() {
    if (!sharedState) {
      console.log('[unhead bridge] syncToSharedState: no sharedState yet')
      return
    }
    const newState = serializeHeadState(head)
    console.log('[unhead bridge] syncing state:', newState.tags.length, 'tags,', newState.entries.length, 'entries')
    sharedState.mutate((draft: any) => {
      Object.assign(draft, newState)
    })
  }

  async function init() {
    console.log('[unhead bridge] init: importing devtools-kit/client')
    const { getDevToolsClientContext } = await import('@vitejs/devtools-kit/client')

    // Retry until DevTools client context is available
    let ctx = getDevToolsClientContext()
    console.log('[unhead bridge] getDevToolsClientContext:', ctx ? 'found' : 'not ready')
    if (!ctx) {
      let retries = 0
      await new Promise<void>((resolve) => {
        const timer = globalThis.setInterval(() => {
          ctx = getDevToolsClientContext()
          if (ctx || ++retries > 50) {
            globalThis.clearInterval(timer)
            if (ctx)
              console.log('[unhead bridge] context found after', retries, 'retries')
            else console.warn('[unhead bridge] gave up waiting for DevTools context after 50 retries')
            resolve()
          }
        }, 100)
      })
    }
    if (!ctx) {
      console.warn('[unhead bridge] no DevTools client context, aborting')
      return
    }

    console.log('[unhead bridge] creating shared state')
    sharedState = await ctx.rpc.sharedState.get('unhead:state', {
      initialValue: serializeHeadState(head),
    })
    console.log('[unhead bridge] shared state created, initial value set')

    if (head.hooks) {
      head.hooks.hook('dom:rendered', syncToSharedState)
      console.log('[unhead bridge] hooked dom:rendered')
    }

    // Initial sync after a short delay to capture early entries
    setTimeout(syncToSharedState, 500)
  }

  init().catch((err) => {
    console.error('[unhead bridge] init failed:', err)
  })
}

function findHead(): any {
  // 1. Streaming plugin pattern: window.__unhead__._head
  if (window.__unhead__?._head) {
    console.log('[unhead bridge] found head via __unhead__._head')
    return window.__unhead__._head
  }

  // 2. Devtools-exposed pattern: window.__unhead_devtools__
  if (window.__unhead_devtools__) {
    console.log('[unhead bridge] found head via __unhead_devtools__')
    return window.__unhead_devtools__
  }

  return null
}

function pollForHead() {
  console.log('[unhead bridge] polling for head instance...')
  let attempts = 0
  const handle = globalThis.setInterval(() => {
    const h = findHead()
    if (h) {
      globalThis.clearInterval(handle)
      console.log('[unhead bridge] head found after', attempts, 'attempts')
      connectBridge(h)
    }
    if (++attempts > 50) {
      globalThis.clearInterval(handle)
      console.warn('[unhead bridge] gave up polling for head after 50 attempts')
    }
  }, 100)
}

console.log('[unhead bridge] bridge script loaded')
if (typeof window !== 'undefined') {
  const head = findHead()
  if (head) {
    console.log('[unhead bridge] head found immediately')
    connectBridge(head)
  }
  else {
    pollForHead()
  }
}
