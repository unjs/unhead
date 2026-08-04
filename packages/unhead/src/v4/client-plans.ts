import type { ClientHead, DomState } from './client'
/**
 * v4 client sealed-plan rendering (opt-in, tree-shaken from the default
 * client bundle). Only compiled apps push PlanTag arrays client-side; they
 * install this renderer explicitly:
 *
 *   import { installPlanRenderer } from 'unhead/v4/client-plans'
 *   installPlanRenderer(head)
 *
 * Prebuilt tags carry final html in `c` (not props); rendering is a regex
 * tag parse into element sync ops. Refills sync only changed attributes;
 * changed scripts are replaced, never mutated (execution semantics).
 */
import type { Tag } from './core'
import { FX_ATTR, FX_CLASS, FX_EL, FX_STYLE, FX_TITLE, hashTag, setAttr } from './client'
import { F_ID, T_BODY_ATTRS, T_HTML_ATTRS, TAG_NAMES, unescapeHtml } from './core'

const ATTR_RE = /\s([^\s=>]+)(?:="([^"]*)")?/g
const QUOT_ENT_RE = /&quot;/g
const unescAttr = (s: string) => s.includes('&quot;') ? s.replace(QUOT_ENT_RE, '"') : s

interface Parsed {
  name: string
  attrs: [string, string][]
  content: string | null
}

/** Regex scan of a single prebuilt tag's html; no HTML parser involved. */
function parsePrebuilt(html: string): Parsed {
  const gt = html.indexOf('>')
  const open = html.slice(1, gt)
  const sp = open.indexOf(' ')
  const name = sp < 0 ? open : open.slice(0, sp)
  const attrs: [string, string][] = []
  if (sp >= 0) {
    ATTR_RE.lastIndex = 0
    let m = ATTR_RE.exec(open)
    while (m) {
      attrs.push([m[1], m[2] === undefined ? '' : unescAttr(m[2])])
      m = ATTR_RE.exec(open)
    }
  }
  const close = html.lastIndexOf('</')
  return { name, attrs, content: close > gt ? html.slice(gt + 1, close) : null }
}

function setParsedContent(el: any, pd: Parsed) {
  // script/style content is raw text; noscript's is markup
  const prop = pd.name === 'noscript' ? 'innerHTML' : 'textContent'
  el[prop] !== pd.content && (el[prop] = pd.content)
}

function buildParsed(doc: Document, pd: Parsed): Element {
  const el = doc.createElement(pd.name)
  for (const [k, v] of pd.attrs) el.setAttribute(k, v)
  if (pd.content != null)
    setParsedContent(el, pd)
  return el
}

/** Attr-level sync: write only what differs, drop what disappeared. */
function syncParsed(el: any, pd: Parsed) {
  for (const [k, v] of pd.attrs) el.getAttribute(k) !== v && el.setAttribute(k, v)
  if (el.attributes.length !== pd.attrs.length) {
    for (const a of el.getAttributeNames()) {
      let keep = false
      for (const [k] of pd.attrs) {
        if (k === a) {
          keep = true
          break
        }
      }
      keep || el.removeAttribute(a)
    }
  }
  if (pd.content != null)
    setParsedContent(el, pd)
}

/** An element (typically SSR-adopted) already equals the parsed tag exactly. */
function sameParsed(el: any, pd: Parsed): boolean {
  if (el.attributes.length !== pd.attrs.length)
    return false
  for (const [k, v] of pd.attrs) {
    if (el.getAttribute(k) !== v)
      return false
  }
  return el[pd.name === 'noscript' ? 'innerHTML' : 'textContent'] === (pd.content ?? '')
}

/**
 * The renderer's F_PREBUILT branch: sealed plan tuple to fx + element ops.
 * Head-position tuples carry no type id in f (revivePlan only encodes
 * position), so dispatch is on d/c. Returns a fresh element for the caller
 * to append into its position bucket, or nothing.
 */
function renderPrebuilt(t: Tag, doc: Document, state: DomState, fx: any[], dupes: Record<string, number>): Element | void {
  const id = t.f & F_ID
  if (id === T_HTML_ATTRS || id === T_BODY_ATTRS) {
    // single-attr fragment string, e.g. ' class="dark"' (wire contract)
    const el: any = id === T_HTML_ATTRS ? doc.documentElement : doc.body
    const c = t.c!
    const eq = c.indexOf('="')
    const k = eq < 0 ? c.slice(1) : c.slice(1, eq)
    const v = eq < 0 ? '' : unescAttr(c.slice(eq + 2, -1))
    if (k === 'class') {
      fx.push(FX_CLASS, el, v)
      el.classList.contains(v) || el.classList.add(v)
    }
    else if (k === 'style') {
      const ci = v.indexOf(':')
      const sk = v.slice(0, ci).trim()
      fx.push(FX_STYLE, el, sk)
      el.style.setProperty(sk, v.slice(ci + 1).trim())
    }
    else {
      fx.push(FX_ATTR, el, k)
      setAttr(el, k, eq < 0 ? true : v)
    }
    return
  }
  if (t.d === 'title') {
    const c = t.c!
    const text = unescapeHtml(c.slice(7, c.length - 8))
    doc.title !== text && (doc.title = text)
    fx.push(FX_TITLE, 0, state.title)
    return
  }
  let pd: Parsed | null = null
  let base = t.d
  if (!base) {
    // keyless tuple: derive the same fallback identity adoption used for the
    // SSR element (hashTag over name/props/content), or hydration duplicates
    pd = parsePrebuilt(t.c!)
    const p: Record<string, any> = {}
    for (const [k, v] of pd.attrs) p[k] = v === '' ? true : v
    base = hashTag({ f: TAG_NAMES.indexOf(pd.name as any), w: 0, o: 0, d: '', p, c: pd.content || null })
  }
  const nth = dupes[base] || 0
  dupes[base] = nth + 1
  const key = nth ? `${base}:${nth}` : base
  let el: any = state.els.get(key)
  const fresh = !el
  if (fresh) {
    el = buildParsed(doc, pd || parsePrebuilt(t.c!))
    el._uhc = t.c
    state.els.set(key, el)
  }
  else if (el._uhc !== t.c) {
    pd ||= parsePrebuilt(t.c!)
    // adopted (SSR) elements carry no _uhc; an identical adopted script is
    // hydration, not a change, so the replace policy must not fire
    if (el.tagName === 'SCRIPT' && !(el._uhc === undefined && sameParsed(el, pd))) {
      // a changed script is a new script; replace, never mutate
      const s: any = buildParsed(doc, pd)
      el.replaceWith(s)
      state.els.set(key, s)
      el = s
    }
    else {
      syncParsed(el, pd)
    }
    el._uhc = t.c
  }
  fx.push(FX_EL, el, key)
  if (fresh)
    return el
}

/** Enable sealed PlanTag rendering on a client head. */
export function installPlanRenderer(head: ClientHead): void {
  head._plans = renderPrebuilt
}
