/**
 * Direct SSR renderer for a route plan emitted by emitSSRRoutePlan.
 *
 * The route plan is already compiled, sorted, deduped, and template-resolved,
 * so this path needs no head instance, entry map, compiler, or plugin runner.
 */
import type { PlanFill } from './core'
import type { SSRPayload } from './server'

export type { PlanFill } from './core'

// Static tuple: [html, position?]. Hole tuple: [segments, modes, position?].
export type SSRRoutePlanTag = [string | string[], number?, number?]
declare const ssrRoutePlan: unique symbol
export type SSRRoutePlan = SSRRoutePlanTag[] & { readonly [ssrRoutePlan]: true }

const ESC_TEXT_RE = /[&<>"'/]/g
const ESC_TEXT: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#x27;', '/': '&#x2F;' }
const ESC_JSON_RE = /[\\"<]/g
const ESC_JSON: Record<string, string> = { '\\': '\\\\', '"': '\\"', '<': '\\u003C' }
const ESC_QUOT_RE = /"/g

function fill(segments: string[], modes: number, fills: readonly PlanFill[], at: number): string {
  let out = segments[0]
  for (let i = 0; i < segments.length - 1; i++) {
    const value = fills[at + i] ?? ''
    const mode = modes >> (i * 2) & 3
    out += (mode === 1
      ? (value.includes('"') ? value.replace(ESC_QUOT_RE, '&quot;') : value)
      : mode === 2
        ? value.replace(ESC_JSON_RE, c => ESC_JSON[c])
        : value.replace(ESC_TEXT_RE, c => ESC_TEXT[c])) + segments[i + 1]
  }
  return out
}

function attrsToString(props: Record<string, string | true>): string {
  let out = ''
  for (const key in props)
    out += props[key] === true ? ` ${key}` : ` ${key}="${props[key]}"`
  return out
}

export function renderSSRRoutePlan(plan: SSRRoutePlan, fills: readonly PlanFill[] = []): SSRPayload {
  const buckets = ['', '', '']
  const bags: Record<string, string | true>[] = [{}, {}]
  let fillAt = 0

  for (let i = 0; i < plan.length; i++) {
    const tuple = plan[i]
    const content = tuple[0]
    const hasHoles = typeof content !== 'string'
    const packed = (hasHoles ? tuple[2] : tuple[1]) || 0
    const position = packed & 7
    const html = hasHoles ? fill(content, tuple[1] || 0, fills, fillAt) : content
    if (hasHoles)
      fillAt += content.length - 1

    if (position === 3 || position === 4) {
      const bag = bags[position - 3]
      const equals = html.indexOf('="')
      const key = equals < 0 ? html.slice(1) : html.slice(1, equals)
      const value = equals < 0 ? true : html.slice(equals + 2, -1)
      if ((key === 'class' || key === 'style') && bag[key])
        bag[key] += `${key === 'class' ? ' ' : ';'}${value}`
      else
        bag[key] = value
    }
    else {
      buckets[position] += html
    }
  }

  return {
    headTags: buckets[0],
    bodyTags: buckets[2],
    bodyTagsOpen: buckets[1],
    htmlAttrs: attrsToString(bags[0]),
    bodyAttrs: attrsToString(bags[1]),
  }
}
