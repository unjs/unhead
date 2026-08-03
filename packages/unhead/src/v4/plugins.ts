/**
 * v4 L2 plugins: the v3 "mostly compatible" plugin surface as resolve-slot plugins.
 * TemplateParamsPlugin, InferSeoMetaPlugin, CanonicalPlugin.
 *
 * All resolve-slot mutation goes through ctx.patch (copy-on-write): entry tag
 * caches are shared across renders and must never be mutated in place.
 */
import type { V4Head, V4Plugin } from './core'
import { F_ID, F_REMOVED, T_HTML_ATTRS, T_LINK, T_META, T_TITLE } from './core'

// ---------------------------------------------------------------------------
// TemplateParamsPlugin
// ---------------------------------------------------------------------------

export interface TemplateParams {
  separator?: string
  pageTitle?: string
  [key: string]: any
}

const BACKSLASH_RE = /\\/g
const LT_RE = /</g
const DOUBLE_QUOTE_RE = /"/g
const TOKEN_RE = /%\w+(?:\.\w+)?/g
const SEP_SUB = '%separator'

function sub(p: TemplateParams, token: string, isJson = false): string | undefined {
  let val: string | undefined
  if (token === 's' || token === 'pageTitle') {
    val = p.pageTitle as string
  }
  else if (token.includes('.')) {
    const dotIndex = token.indexOf('.')
    val = (p[token.substring(0, dotIndex)] as Record<string, string> | undefined)?.[token.substring(dotIndex + 1)]
  }
  else {
    val = p[token] as string | undefined
  }
  if (val !== undefined) {
    return isJson
      ? (val || '').replace(BACKSLASH_RE, '\\\\').replace(LT_RE, '\\u003C').replace(DOUBLE_QUOTE_RE, '\\"')
      : val || ''
  }
  return undefined
}

/** Port of v3 utils/templateParams processTemplateParams, incl. separator collapse. */
export function processTemplateParams(s: string, p: TemplateParams, sep: string, isJson = false): string {
  if (typeof s !== 'string' || !s.includes('%'))
    return s
  // avoid replacing url-encoded values
  let decoded = s
  try {
    decoded = decodeURI(s)
  }
  catch {
    // malformed encoded input: fall back to token matching on the original string
  }
  const tokens = decoded.match(TOKEN_RE)
  if (!tokens)
    return s
  const hasSepSub = s.includes(SEP_SUB)
  s = s.replace(TOKEN_RE, (token) => {
    if (token === SEP_SUB || !tokens.includes(token))
      return token
    const re = sub(p, token.slice(1), isJson)
    return re !== undefined ? re : token
  }).trim()
  // separators collapse when a neighbor is empty: '%separator %separator x' -> 'x'
  if (hasSepSub) {
    s = s.split(SEP_SUB)
      .map(part => part.trim())
      .filter(part => part !== '')
      .join(sep ? ` ${sep} ` : ' ')
  }
  return s
}

interface TemplateParamsStore { n: number, m: Map<number, TemplateParams> }

/**
 * Params transport. v3 accepted a `templateParams` key inside useHead input;
 * the v4 L1 compiler ignores unknown keys, so params travel beside the entry
 * graph instead: `useTemplateParams(head, params)` registers a params source
 * on the head (multiple sources shallow-merge in registration order, matching
 * v3's entry merge). Returns a handle with patch/dispose like an entry.
 */
export function useTemplateParams(head: V4Head, params: TemplateParams) {
  const s: TemplateParamsStore = ((head as any)._tp ||= { n: 0, m: new Map() })
  const i = s.n++
  s.m.set(i, params)
  return {
    patch(next: TemplateParams) {
      s.m.set(i, next)
    },
    dispose() {
      s.m.delete(i)
    },
  }
}

export const TemplateParamsPlugin: V4Plugin = {
  key: 'template-params',
  resolve(ctx) {
    const store: TemplateParamsStore | undefined = (ctx.head as any)._tp
    const p: TemplateParams = {}
    if (store) {
      for (const params of store.m.values()) Object.assign(p, params)
    }
    const sep = p.separator || '|'
    delete p.separator
    // raw (pre-titleTemplate) title, published by TitlePlugin (always first)
    p.pageTitle = processTemplateParams((p.pageTitle as string) || (ctx.shared.title as string) || '', p, sep)
    ctx.each((tag) => {
      if (tag.f & F_REMOVED)
        return
      const id = tag.f & F_ID
      if (id === T_TITLE) {
        if (typeof tag.c === 'string') {
          const next = processTemplateParams(tag.c, p, sep)
          if (next !== tag.c)
            ctx.patch(tag, { c: next })
        }
        return
      }
      const attr = id === T_META ? 'content' : id === T_LINK ? 'href' : id === T_HTML_ATTRS ? 'lang' : null
      if (!attr)
        return
      const v = tag.p?.[attr]
      if (typeof v === 'string') {
        const next = processTemplateParams(v, p, sep)
        if (next !== v)
          ctx.patch(tag, { p: { ...tag.p, [attr]: next } })
      }
    })
  },
}

// ---------------------------------------------------------------------------
// InferSeoMetaPlugin
// ---------------------------------------------------------------------------

export interface InferSeoMetaPluginOptions {
  /** Transform the inferred og:title. */
  ogTitle?: (title?: string) => string
  /** Transform the inferred og:description. */
  ogDescription?: (description?: string) => string
  /** Twitter card to push, or false to skip. */
  twitterCard?: false | 'summary' | 'summary_large_image' | 'app' | 'player'
}

const hasContent = (value: unknown) => typeof value === 'number' ? Number.isFinite(value) : value

export function InferSeoMetaPlugin(options: InferSeoMetaPluginOptions = {}): V4Plugin {
  return {
    key: 'infer-seo-meta',
    init(head) {
      if (options.twitterCard !== false) {
        head.push({
          meta: [{ name: 'twitter:card', content: options.twitterCard || 'summary_large_image', tagPriority: 'low' }],
        })
      }
      // placeholders carry empty content (the v4 compiler drops content-less
      // metas) and are filled or removed in the resolve slot
      head.push({
        meta: [
          { 'property': 'og:title', 'data-infer': '', 'content': '', 'tagPriority': 'low' },
          { 'property': 'og:description', 'data-infer': '', 'content': '', 'tagPriority': 'low' },
        ],
      })
    },
    resolve(ctx) {
      const ogTitle = ctx.get('meta:og:title')
      if (ogTitle && !(ogTitle.f & F_REMOVED) && ogTitle.p?.['data-infer'] !== undefined) {
        // final title, published by TitlePlugin (always first)
        const title = ctx.shared.titleResolved
        const t = hasContent(title) ? String(title) : undefined
        const content = options.ogTitle ? options.ogTitle(t) : t || ''
        content
          ? ctx.patch(ogTitle, { p: { ...ogTitle.p, content } })
          : ctx.patch(ogTitle, { f: ogTitle.f | F_REMOVED })
      }
      const ogDescription = ctx.get('meta:og:description')
      if (ogDescription && !(ogDescription.f & F_REMOVED) && ogDescription.p?.['data-infer'] !== undefined) {
        const descriptionValue = ctx.get('meta:description')?.p?.content
        const d = hasContent(descriptionValue) ? String(descriptionValue) : undefined
        const content = options.ogDescription ? options.ogDescription(d) : d || ''
        content
          ? ctx.patch(ogDescription, { p: { ...ogDescription.p, content } })
          : ctx.patch(ogDescription, { f: ogDescription.f | F_REMOVED })
      }
    },
  }
}

// ---------------------------------------------------------------------------
// CanonicalPlugin
// ---------------------------------------------------------------------------

export interface CanonicalPluginOptions {
  canonicalHost?: string
  customResolver?: (url: string) => string
  /**
   * Query parameters to preserve in canonical and og:url tags; all others are
   * stripped. `false` disables filtering.
   * @default [] (strips all query params)
   */
  queryWhitelist?: string[] | false
  /**
   * true = always add trailing slash, false = always remove, undefined = leave as-is.
   */
  trailingSlash?: boolean
}

const META_TRANSFORMABLE_URL = /* @__PURE__ */ new Set([
  'og:url',
  'og:image',
  'og:image:url',
  'og:image:secure_url',
  'twitter:image',
  'twitter:image:src',
  'og:video',
  'og:video:url',
  'og:video:secure_url',
  'og:audio',
  'og:audio:url',
  'og:audio:secure_url',
  'twitter:player',
  'twitter:player:stream',
])

const LINK_REL_RESOLVABLE = /* @__PURE__ */ new Set(['canonical', 'next', 'prev', 'alternate', 'author', 'license', 'help', 'search', 'pingback'])

export function CanonicalPlugin(options: CanonicalPluginOptions): V4Plugin {
  let host: string | undefined
  const whitelist = options.queryWhitelist !== undefined ? options.queryWhitelist : []

  function resolveHost(head: V4Head): string {
    if (host !== undefined)
      return host
    let h = options.canonicalHost || (!head.ssr ? window.location.origin : '')
    if (!h.startsWith('http') && !h.startsWith('//'))
      h = `https://${h}`
    // throws when canonicalHost is not a valid URL, matching v3
    host = new URL(h).origin
    return host
  }

  function normalizeCanonicalUrl(url: string, h: string): string {
    try {
      const parsed = new URL(url, h)
      // hash fragments are client-side only, search engines ignore them
      parsed.hash = ''
      if (whitelist !== false && parsed.search) {
        const filtered = new URLSearchParams()
        for (const key of whitelist) {
          for (const value of parsed.searchParams.getAll(key)) filtered.append(key, value)
        }
        parsed.search = filtered.toString()
      }
      if (options.trailingSlash === true && !parsed.pathname.endsWith('/'))
        parsed.pathname = `${parsed.pathname}/`
      else if (options.trailingSlash === false && parsed.pathname !== '/' && parsed.pathname.endsWith('/'))
        parsed.pathname = parsed.pathname.slice(0, -1)
      return parsed.toString()
    }
    catch {
      return url
    }
  }

  function resolvePath(path: string, h: string): string {
    if (options.customResolver)
      return options.customResolver(path)
    if (path.startsWith('http') || path.startsWith('//'))
      return path
    try {
      return new URL(path, h).toString()
    }
    catch {
      return path
    }
  }

  return {
    key: 'canonical',
    init(head) {
      resolveHost(head)
    },
    resolve(ctx) {
      const h = resolveHost(ctx.head)
      ctx.each((tag) => {
        if (tag.f & F_REMOVED)
          return
        const id = tag.f & F_ID
        if (id === T_META) {
          // property and name are interchangeable for DX, matching v3
          const metaKey = tag.p?.property || tag.p?.name
          if (typeof metaKey === 'string' && META_TRANSFORMABLE_URL.has(metaKey) && typeof tag.p!.content === 'string') {
            let content = resolvePath(tag.p!.content, h)
            if (metaKey === 'og:url')
              content = normalizeCanonicalUrl(content, h)
            if (content !== tag.p!.content)
              ctx.patch(tag, { p: { ...tag.p, content } })
          }
        }
        else if (id === T_LINK && typeof tag.p?.rel === 'string' && LINK_REL_RESOLVABLE.has(tag.p.rel) && typeof tag.p.href === 'string') {
          let href = resolvePath(tag.p.href, h)
          if (tag.p.rel === 'canonical')
            href = normalizeCanonicalUrl(href, h)
          if (href !== tag.p.href)
            ctx.patch(tag, { p: { ...tag.p, href } })
        }
      })
    },
  }
}
