/**
 * v4 server: createHead + SSR renderer. String buckets built with `+=`
 * (measured 6.5x over array-join), escaping contract identical to v3.
 */
import type { EntryOptions, PlanTag, Tag, V4Head } from './core'
import { compileEntry, TitlePlugin } from './compile'
import {
  createCore,
  F_ID,
  F_POS,
  F_PREBUILT,
  F_REMOVED,
  INNER_CONTENT,
  POS_SHIFT,
  SELF_CLOSING,
  T_BODY_ATTRS,
  T_HTML_ATTRS,
  T_TITLE,
  T_TITLE_TEMPLATE,
  TAG_NAMES,
} from './core'

export interface SSRPayload {
  headTags: string
  bodyTags: string
  bodyTagsOpen: string
  htmlAttrs: string
  bodyAttrs: string
}

// matches v3 default init (lang=en, charset, viewport) as a frozen module-level plan
export const DEFAULT_PLAN: PlanTag[] = [
  [-20, 'charset', '<meta charset="utf-8">'],
  [-15, 'meta:viewport', '<meta name="viewport" content="width=device-width, initial-scale=1">'],
  [100, 'htmlAttrs:lang', ' lang="en"', 3],
]

const ESC_HTML_RE = /[&<>"'/]/g
const ESC_MAP: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#x27;', '/': '&#x2F;' }
const escapeHtml = (s: string) => s.replace(ESC_HTML_RE, c => ESC_MAP[c])
const QUOT_RE = /"/g

export function propsToString(props: Record<string, any>): string {
  let attrs = ''
  for (const k in props) {
    let v = props[k]
    if (v === false || v === null)
      continue
    if (v === true) {
      attrs += ` ${k}`
      continue
    }
    if (typeof v !== 'string') {
      if (k === 'class')
        v = Array.from(v as Set<string>).join(' ')
      else if (k === 'style')
        v = Array.from(v as Map<string, string>).map(([a, b]) => `${a}:${b}`).join(';')
      else v = String(v)
    }
    // quote-guard: measured 3x on the clean-value common case
    attrs += ` ${k}="${v.includes('"') ? v.replace(QUOT_RE, '&quot;') : v}"`
  }
  return attrs
}

/** Serialize one element tag to html. Exposed for the bundler's plan emitter. */
export function tagToHtml(t: Tag): string {
  const id = t.f & F_ID
  const name = TAG_NAMES[id]
  const open = `<${name}${t.p ? propsToString(t.p) : ''}>`
  return (SELF_CLOSING >> id & 1)
    ? open
    : (INNER_CONTENT >> id & 1)
        ? `${open}${id === T_TITLE ? escapeHtml(t.c ?? '') : t.c ?? ''}</${name}>`
        : `${open}</${name}>`
}

export function renderSSRHead(head: V4Head): SSRPayload {
  const tags = head.resolve()
  let hd = ''
  let bo = ''
  let bc = ''
  let htmlAttrs = ''
  let bodyAttrs = ''
  // per-prop attr tags merge into one bag; class/style tokens accumulate
  let htmlBag: Record<string, any> | null = null
  let bodyBag: Record<string, any> | null = null

  for (let i = 0; i < tags.length; i++) {
    const t = tags[i]
    const f = t.f
    if (f & F_REMOVED)
      continue
    const id = f & F_ID

    if (id === T_HTML_ATTRS || id === T_BODY_ATTRS) {
      if (f & F_PREBUILT) {
        // plan attr fragments are final strings
        id === T_HTML_ATTRS ? htmlAttrs += t.c : bodyAttrs += t.c
        continue
      }
      const bag = id === T_HTML_ATTRS ? (htmlBag ||= {}) : (bodyBag ||= {})
      const p = t.p!
      for (const k in p) {
        if (k === 'class' || k === 'style')
          bag[k] = bag[k] ? `${bag[k]}${k === 'class' ? ' ' : ';'}${p[k]}` : p[k]
        else
          bag[k] = p[k]
      }
      continue
    }
    if (id === T_TITLE_TEMPLATE)
      continue

    const s = f & F_PREBUILT ? t.c! : tagToHtml(t)
    const pos = (f & F_POS) >> POS_SHIFT
    if (pos === 0)
      hd += s
    else if (pos === 1)
      bo += s
    else bc += s
  }

  if (htmlBag)
    htmlAttrs += propsToString(htmlBag)
  if (bodyBag)
    bodyAttrs += propsToString(bodyBag)
  return { headTags: hd, bodyTags: bc, bodyTagsOpen: bo, htmlAttrs, bodyAttrs }
}

export interface CreateServerHeadOptions {
  disableDefaults?: boolean
}

export function createHead(options: CreateServerHeadOptions = {}): V4Head {
  const head = createCore({ ssr: true, compile: compileEntry })
  head.use(TitlePlugin)
  if (!options.disableDefaults)
    head.push(DEFAULT_PLAN)
  return head
}

export function useHead(head: V4Head, input: unknown, opts?: EntryOptions) {
  return head.push(input, opts)
}

export type { EntryOptions, PlanTag, Tag, V4Head }
