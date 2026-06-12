import type { HeadTag } from '../types'
import { ValidHeadTags } from './const'
import { dedupeKey } from './dedupe'

const LT_RE = /</g
const SCRIPT_END_RE = /<\/script/g

/**
 * Marker for process-shared static tags that were pre-sanitized (validated,
 * script content escaped) at materialization time. Stored as a
 * non-enumerable symbol property holding a per-tag render-cache box, so:
 * - object spreads (hook replacements) do NOT carry it — replaced tags
 *   always go through the full per-render sanitize pass and re-render;
 *   escaping cannot be bypassed
 * - the box stays mutable after the tag itself is frozen, letting the SSR
 *   renderer lazily cache the tag's HTML string
 */
const kStatic = Symbol.for('unhead:static-tag')

export interface StaticTagState { html?: string }

export function markStaticTag(t: HeadTag): void {
  Object.defineProperty(t, kStatic, { value: {}, enumerable: false })
}

export function staticTagState(t: HeadTag): StaticTagState | undefined {
  return (t as any)[kStatic]
}

/** Escapes inline script content in place (call before freezing). */
function escapeScriptContent(t: HeadTag): void {
  const type = String(t.props.type)
  const isJsonLike = type.endsWith('json') || type === 'importmap' || type === 'speculationrules'
  const escape = (content: unknown): unknown => isJsonLike
    ? (typeof content === 'string' ? content : JSON.stringify(content)).replace(LT_RE, '\\u003C')
    : typeof content === 'string' ? content.replace(SCRIPT_END_RE, '<\\/script') : content
  if (t.innerHTML)
    t.innerHTML = escape(t.innerHTML) as typeof t.innerHTML
  if (t.textContent)
    t.textContent = escape(t.textContent) as typeof t.textContent
}

function isDropped(t: HeadTag): boolean {
  if (!ValidHeadTags.has(t.tag) || (!Object.keys(t.props).length && !t.innerHTML && !t.textContent))
    return true
  return t.tag === 'meta' && !t.props.content && !t.props['http-equiv'] && !t.props.charset
}

/**
 * Pre-sanitizes a process-shared static tag at materialization time so the
 * per-render sanitize pass can skip it entirely. Tags the sanitizer would
 * drop (invalid/virtual tags like titleTemplate, empty tags) are left
 * unregistered — they still flow through resolve and are dropped per render.
 */
export function prepareStaticTag(t: HeadTag): void {
  if (isDropped(t))
    return
  if (t.tag === 'script' && (t.innerHTML || t.textContent)) {
    escapeScriptContent(t)
    t._d = dedupeKey(t)
  }
  markStaticTag(t)
}

export function sanitizeTags(tags: HeadTag[]): HeadTag[] {
  const out: HeadTag[] = []
  for (let t of tags) {
    // pre-sanitized shared static tag: nothing to validate or escape
    if ((t as any)[kStatic]) {
      out.push(t)
      continue
    }
    if (isDropped(t))
      continue
    if (t.tag === 'script' && (t.innerHTML || t.textContent)) {
      // copy-on-write: resolved tags may be shared with the entry cache
      t = { ...t }
      escapeScriptContent(t)
      t._d = dedupeKey(t)
    }
    out.push(t)
  }
  return out
}
