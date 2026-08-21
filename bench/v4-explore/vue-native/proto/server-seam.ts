/**
 * Prototype: renderSSRHead with an injectable attribute/text serializer seam.
 *
 * Shape under test: the seam is a SEPARATE export (`renderSSRHeadWith`), not
 * an options bag with a default. That way a vue consumer that only imports
 * `renderSSRHeadWith` + a vue-backed serializer lets the bundler drop the
 * core serializer entirely, while plain consumers importing `renderSSRHead`
 * pay only the one-line wrapper.
 */
import type { Tag, V4Head } from '../../../../packages/unhead/src/v4/core'
import {
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
} from '../../../../packages/unhead/src/v4/core'

export interface SSRPayload {
  headTags: string
  bodyTags: string
  bodyTagsOpen: string
  htmlAttrs: string
  bodyAttrs: string
}

export interface Serializer {
  /** props -> ` k="v" k2` attribute string (leading-space form) */
  props: (props: Record<string, any>) => string
  /** title text escape */
  text: (s: string) => string
}

// --- default serializer: byte-for-byte copy of v4/server.ts ---------------

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
    attrs += ` ${k}="${v.includes('"') ? v.replace(QUOT_RE, '&quot;') : v}"`
  }
  return attrs
}

export const defaultSerializer: Serializer = { props: propsToString, text: escapeHtml }

// --- seam renderer ---------------------------------------------------------

function tagToHtmlWith(t: Tag, s: Serializer): string {
  const id = t.f & F_ID
  const name = TAG_NAMES[id]
  const open = `<${name}${t.p ? s.props(t.p) : ''}>`
  return (SELF_CLOSING >> id & 1)
    ? open
    : `${open}${(INNER_CONTENT >> id & 1) ? (id === T_TITLE ? s.text(t.c ?? '') : t.c ?? '') : ''}</${name}>`
}

export function renderSSRHeadWith(head: V4Head, s: Serializer): SSRPayload {
  const tags = head.resolve()
  const buckets = ['', '', '']
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

    buckets[(f & F_POS) >> POS_SHIFT] += f & F_PREBUILT ? t.c! : tagToHtmlWith(t, s)
  }

  return {
    headTags: buckets[0],
    bodyTags: buckets[2],
    bodyTagsOpen: buckets[1],
    htmlAttrs: bags[0] ? s.props(bags[0]) : '',
    bodyAttrs: bags[1] ? s.props(bags[1]) : '',
  }
}

export const renderSSRHead = (head: V4Head): SSRPayload => renderSSRHeadWith(head, defaultSerializer)
