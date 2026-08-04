/**
 * v4 build-time plan emitter: compiles static (possibly hole-bearing) head
 * objects into the sealed PlanTag wire format (V4_DESIGN.md 2.4, 11).
 *
 * The bundler transform extracts a static object literal from user code,
 * replaces dynamic AST expressions with hole() markers, and calls
 * emitEntryPlan (per entry) or emitRoutePlan (cross-entry pre-merge).
 * Static values become prebuilt html tuples byte-identical to what
 * compileEntry + renderSSRHead produce (the dual-path law); holes become
 * segment-array tuples whose escape mode is fixed at build time.
 *
 * Fill contract: revivePlan consumes fills with a single left-to-right
 * cursor over the plan (tuple order, then hole order inside each tuple).
 * Fill slot i is therefore the i-th hole encountered scanning the emitted
 * plan top to bottom. For entry plans that matches input traversal order;
 * route plans sort and dedupe, so `fillOrder[i]` maps fill slot i back to
 * the hole's creation order (input traversal order across entries) and the
 * bundler must reorder its expressions accordingly. A hole that loses
 * build-time dedupe in a route plan is simply absent from fillOrder.
 *
 * All shapes that cannot compile deterministically throw PlanEmitError so
 * the bundler has an unambiguous bail-to-runtime signal.
 */
import type { EntryOptions, PlanTag, Tag } from './core'
import { compileEntry, TitlePlugin } from './compile'
import {
  createCore,
  F_ARRAYABLE,
  F_ID,
  F_POS,
  F_REMOVED,
  POS_SHIFT,
  T_BODY_ATTRS,
  T_HTML_ATTRS,
  T_TITLE,
  T_TITLE_TEMPLATE,
  TAG_NAMES,
} from './core'
import { propsToString, tagToHtml } from './server'

export class PlanEmitError extends Error {
  constructor(message: string) {
    super(`[unhead:emit] ${message}`)
    this.name = 'PlanEmitError'
  }
}

function bail(message: string): never {
  throw new PlanEmitError(message)
}

export type HoleMode = 'text' | 'attr' | 'json'

const HOLE_BRAND = Symbol.for('unhead:v4:hole')

export interface Hole {
  [HOLE_BRAND]: true
  mode: HoleMode | null
}

/**
 * Marker for a dynamic value inside an otherwise static head object.
 * Mode is normally inferred from position (text for title/textContent,
 * attr for prop values, json for JSON script content); an explicit mode
 * always wins.
 */
export function hole(mode?: HoleMode): Hole {
  return { [HOLE_BRAND]: true, mode: mode || null }
}

export function isHole(v: unknown): v is Hole {
  return !!v && typeof v === 'object' && (v as Record<symbol, unknown>)[HOLE_BRAND] === true
}

// escape-mode bits, packed 2 per hole into a tuple's modes word (core fillHoles)
const MODE_BITS: Record<HoleMode, number> = { text: 0, attr: 1, json: 2 }

// hole placeholders must survive every compile-time transform untouched:
// private-use-area chars pass through JSON.stringify, escapeHtml, the attr
// quote guard and the </script terminator regex without rewriting
const TOKEN_OPEN = '\uE000'
const TOKEN_RE = /\uE000(\d+)\uE000/g

const isJsonType = (t: unknown) => String(t).endsWith('json') || t === 'importmap' || t === 'speculationrules'

/** Register one hole; returns its placeholder token. */
function tok(reg: number[], mode: HoleMode | null, h: Hole): string {
  const m = h.mode || mode
  if (!m)
    bail('a hole in raw innerHTML has no inferable escape mode; pass hole(\'json\') for JSON content or leave the tag to runtime')
  reg.push(MODE_BITS[m])
  return `\uE000${reg.length - 1}\uE000`
}

function tokDeep(v: any, mode: HoleMode, reg: number[]): any {
  if (isHole(v))
    return tok(reg, mode, v)
  if (typeof v === 'function')
    bail('function values cannot be compiled into a plan')
  if (Array.isArray(v))
    return v.map(x => tokDeep(x, mode, reg))
  if (v && typeof v === 'object') {
    const out: Record<string, any> = {}
    for (const k in v) out[k] = tokDeep(v[k], mode, reg)
    return out
  }
  return v
}

function tokTagObj(tag: string, obj: Record<string, any>, reg: number[]): Record<string, any> {
  const out: Record<string, any> = {}
  for (const k in obj) {
    const v = obj[k]
    if (k === 'key' || k === 'tagPosition' || k === 'tagPriority' || k === 'tagDuplicateStrategy' || k === 'processTemplateParams') {
      if (isHole(v) || typeof v === 'function')
        bail(`"${k}" must be static: it fixes identity or placement at build time`)
      out[k] = v
    }
    else if (k === 'innerHTML' || k === 'textContent') {
      if (isHole(v))
        out[k] = tok(reg, isJsonType(obj.type) ? 'json' : k === 'textContent' ? 'text' : null, v)
      else if (typeof v === 'function')
        bail('function values cannot be compiled into a plan')
      else if (v && typeof v === 'object')
        out[k] = tokDeep(v, 'json', reg)
      else
        out[k] = v
    }
    else {
      // rel drives link weights, type drives script weight + content escaping;
      // both are baked into the tuple at build time
      if (isHole(v) && ((tag === 'script' && k === 'type') || (tag === 'link' && k === 'rel')))
        bail(`a hole in <${tag} ${k}> would change weight/escaping semantics that a sealed plan fixes at build time`)
      out[k] = tokDeep(v, 'attr', reg)
    }
  }
  return out
}

/** Clone a head input, swapping hole markers for placeholder tokens. */
function tokHead(input: Record<string, any>, reg: number[], allowTitleTemplate: boolean): Record<string, any> {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    bail('emitter input must be a plain head object')
  const out: Record<string, any> = {}
  for (const k in input) {
    const v = input[k]
    if (k === 'titleTemplate') {
      if (v != null && !allowTitleTemplate)
        bail('titleTemplate cannot be sealed into a single entry plan; pre-merge it with emitRoutePlan or leave the entry to runtime')
      if (isHole(v) || typeof v === 'function')
        bail('titleTemplate must be a static string to pre-merge')
      out[k] = v
    }
    else if (k === 'title') {
      if (typeof v === 'function')
        bail('function values cannot be compiled into a plan')
      out[k] = isHole(v) ? tok(reg, 'text', v) : v
    }
    else if (k === 'htmlAttrs' || k === 'bodyAttrs') {
      if (isHole(v))
        bail(`a hole must replace an attribute value, not the whole ${k} object`)
      out[k] = tokDeep(v, 'attr', reg)
    }
    else {
      const items = Array.isArray(v) ? v : [v]
      const mapped = items.map((item) => {
        if (isHole(item))
          bail(`a hole must replace a value inside a <${k}> tag, not the whole tag`)
        if (typeof item === 'function')
          bail('function values cannot be compiled into a plan')
        return item && typeof item === 'object' ? tokTagObj(k, item, reg) : item
      })
      out[k] = Array.isArray(v) ? mapped : mapped[0]
    }
  }
  return out
}

export interface EmitResult {
  plan: PlanTag[]
  /** Fill slots the plan consumes (revivePlan's cursor length). */
  holes: number
  /** fillOrder[i] = creation-order index (input traversal) of the hole filling slot i. */
  fillOrder: number[]
}

interface EmitItem {
  w: number
  d: string
  pos: number
  html: string
}

/** Serialize compiled/resolved tags to plan tuples, splitting hole tokens into segments. */
function serialize(tags: Tag[], reg: number[]): EmitResult {
  const items: EmitItem[] = []

  for (const t of tags) {
    if (t.f & F_REMOVED)
      continue
    const id = t.f & F_ID
    if (t.d.includes(TOKEN_OPEN))
      bail(`hole in an identity-critical position on <${TAG_NAMES[id]}>: the computed dedupe identity would be dynamic`)
    if (id === T_TITLE_TEMPLATE)
      bail('titleTemplate cannot be sealed into a plan')
    if (id === T_HTML_ATTRS || id === T_BODY_ATTRS) {
      // per-prop fragments keep the runtime d (class/style stay per token) so
      // revived fragments dedupe against runtime attr pushes in core;
      // renderSSRHead folds prebuilt fragments back through its attr bag
      items.push({ w: t.w, d: t.d, pos: id === T_HTML_ATTRS ? 3 : 4, html: propsToString(t.p!) })
      continue
    }
    const html = tagToHtml(t)
    // a lone titleTemplate folds to a title but keeps d 'titleTemplate'
    // (see V4_DESIGN.md 12.5); emit as 'title' so runtime pushes override it
    const d = id === T_TITLE && t.d === 'titleTemplate' ? 'title' : t.d
    // pf bit 3 carries F_ARRAYABLE so revived same-d tuples arrayable-append
    // within the plan entry instead of dedupe-replacing (wire format v1)
    items.push({ w: t.w, d, pos: (t.f & F_POS) >> POS_SHIFT | (t.f & F_ARRAYABLE ? 8 : 0), html })
  }

  const plan: PlanTag[] = []
  const fillOrder: number[] = []
  for (const it of items) {
    const html = it.html
    if (!html.includes(TOKEN_OPEN)) {
      plan.push(it.pos ? [it.w, it.d, html, it.pos] : [it.w, it.d, html])
      continue
    }
    const segments: string[] = []
    let modes = 0
    let count = 0
    let last = 0
    TOKEN_RE.lastIndex = 0
    let m = TOKEN_RE.exec(html)
    while (m) {
      if (count === 15)
        bail('a plan tuple supports at most 15 holes (2-bit modes in one word)')
      segments.push(html.slice(last, m.index))
      modes |= reg[+m[1]] << (count * 2)
      fillOrder.push(+m[1])
      count++
      last = m.index + m[0].length
      m = TOKEN_RE.exec(html)
    }
    segments.push(html.slice(last))
    plan.push(it.pos ? [it.w, it.d, segments, modes, it.pos] : [it.w, it.d, segments, modes])
  }
  return { plan, holes: fillOrder.length, fillOrder }
}

/**
 * Compile one head object (with optional holes) to plan tuples.
 * Static values become prebuilt html; holes become segment tuples.
 * Throws PlanEmitError on shapes that cannot seal (titleTemplate, functions,
 * identity-critical holes) so the bundler bails the entry to runtime.
 */
export function emitEntryPlan(input: Record<string, any>, opts?: EntryOptions): EmitResult {
  const reg: number[] = []
  const tokenized = tokHead(input, reg, false)
  const res = serialize(compileEntry(tokenized, 0, opts || null), reg)
  // entry plans never dedupe at build time, so every hole must reach the plan
  if (res.holes !== reg.length)
    bail('a hole sits in a position the compiler drops (empty tag, contentless meta, or an unsupported slot); leave the entry to runtime')
  return res
}

/**
 * Cross-entry pre-merge (V4_DESIGN.md 11): run the full L1 + dedupe +
 * titleTemplate pipeline over a route's entries at build time and emit one
 * folded plan. Merged tags keep their true d and w, so runtime entries still
 * override through ordinary dedupe. Static titleTemplate + static title fold
 * to a final title; a dynamic (hole) title under a titleTemplate throws.
 */
export function emitRoutePlan(entries: [Record<string, any>, EntryOptions?][]): EmitResult {
  const reg: number[] = []
  let hasTemplate = false
  let holeTitle = false
  const tokenized: [Record<string, any>, EntryOptions | undefined][] = entries.map(([input, opts]) => {
    if (!input || typeof input !== 'object' || Array.isArray(input))
      bail('emitRoutePlan entries must be plain head objects')
    if (input.titleTemplate != null)
      hasTemplate = true
    if (isHole(input.title))
      holeTitle = true
    return [tokHead(input, reg, true), opts]
  })
  if (hasTemplate && holeTitle)
    bail('a static titleTemplate cannot pre-merge over a dynamic title; leave the title entry to runtime')
  const head = createCore({ ssr: true, compile: compileEntry })
  head.use(TitlePlugin)
  for (const [input, opts] of tokenized) head.push(input, opts)
  // no holes===reg.length assert here: build-time dedupe may legally drop a
  // hole-bearing loser; fillOrder is the authoritative slot map
  return serialize(head.resolve(), reg)
}

export interface PlanToCodeOptions {
  /** Raw JS expression sources for each fill slot, in fill (plan-scan) order. */
  fills?: string[]
}

/**
 * Serialize a plan to the JS source a bundler injects as a module-hoisted
 * const. Without fills the output is a single array literal (also valid
 * JSON); with fills it is `[plan, { fills: [...] }]`, spreadable into
 * `head.push(...pair)`, where each fill is a raw JS expression.
 */
export function planToCode(plan: PlanTag[], opts: PlanToCodeOptions = {}): string {
  const str = (s: string) => JSON.stringify(s).replace(/[\u2028\u2029]/g, c => c === '\u2028' ? '\\u2028' : '\\u2029')
  const cell = (v: number | string | string[]) => typeof v === 'number'
    ? String(v)
    : typeof v === 'string'
      ? str(v)
      : `[${v.map(str).join(',')}]`
  const src = `[${plan.map(t => `[${(t as (number | string | string[])[]).map(cell).join(',')}]`).join(',')}]`
  return opts.fills ? `[${src},{fills:[${opts.fills.join(',')}]}]` : src
}
