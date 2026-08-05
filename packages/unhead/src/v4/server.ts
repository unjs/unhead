/** @experimental v4 preview surface: semver-exempt until v4 stabilizes. See packages/unhead/V4_DESIGN.md. */
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
      v = k === 'class'
        ? [...v as Set<string>].join(' ')
        : k === 'style'
          ? [...v as Map<string, string>].map(([a, b]) => `${a}:${b}`).join(';')
          : String(v)
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
    : `${open}${(INNER_CONTENT >> id & 1) ? (id === T_TITLE ? escapeHtml(t.c ?? '') : t.c ?? '') : ''}</${name}>`
}

export function renderSSRHead(head: V4Head): SSRPayload {
  const tags = head.resolve()
  const buckets = ['', '', ''] // head, bodyOpen, bodyClose
  // per-prop attr tags merge into one bag; class/style tokens accumulate
  const bags: (Record<string, any> | null)[] = [null, null]

  for (let i = 0; i < tags.length; i++) {
    const t = tags[i]
    const f = t.f
    if (f & F_REMOVED)
      continue
    const id = f & F_ID

    if (id === T_HTML_ATTRS || id === T_BODY_ATTRS) {
      const bag = bags[id - T_HTML_ATTRS] ||= {}
      let p = t.p
      if (f & F_PREBUILT) {
        // plan attr fragments are single-attr strings (wire contract); parse
        // the prop back out so prebuilt and runtime attrs merge through one
        // bag; the fragment value is already attr-escaped, propsToString's
        // quote guard passes it through untouched
        const c = t.c!
        const eq = c.indexOf('="')
        p = eq < 0 ? { [c.slice(1)]: true } : { [c.slice(1, eq)]: c.slice(eq + 2, -1) }
      }
      for (const k in p!) {
        if (k === 'class' || k === 'style')
          bag[k] = bag[k] ? `${bag[k]}${k === 'class' ? ' ' : ';'}${p![k]}` : p![k]
        else
          bag[k] = p![k]
      }
      continue
    }
    if (id === T_TITLE_TEMPLATE)
      continue

    buckets[(f & F_POS) >> POS_SHIFT] += f & F_PREBUILT ? t.c! : tagToHtml(t)
  }

  return {
    headTags: buckets[0],
    bodyTags: buckets[2],
    bodyTagsOpen: buckets[1],
    htmlAttrs: bags[0] ? propsToString(bags[0]) : '',
    bodyAttrs: bags[1] ? propsToString(bags[1]) : '',
  }
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
