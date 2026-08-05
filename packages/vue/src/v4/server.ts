/** @experimental v4 preview surface: semver-exempt until v4 stabilizes. See packages/unhead/V4_DESIGN.md. */
import type { EntryOptions, Tag, V4Head, V4Plugin } from 'unhead/v4'
import type { VueHeadClient } from './types'
import { walkResolver } from 'unhead/utils'
import {
  F_ID,
  F_POS,
  F_PREBUILT,
  F_REMOVED,
  POS_SHIFT,
  T_BODY_ATTRS,
  T_HTML_ATTRS,
  T_TITLE_TEMPLATE,
} from 'unhead/v4'
import { createHead as _createHead, propsToString, tagToHtml } from 'unhead/v4/server'
import { vueInstall } from './install'
import { VueResolver } from './resolver'

export { propsToString }

export interface SSRHeadPayload {
  headTags: string
  bodyTags: string
  bodyTagsOpen: string
  htmlAttrs: string
  bodyAttrs: string
}

export interface RenderSSRHeadOptions {
  omitLineBreaks?: boolean
}

export interface CreateServerHeadOptions {
  disableDefaults?: boolean
  /** v3 compat: accepted and ignored, capo weights are built into the v4 compiler */
  disableCapoSorting?: boolean
  plugins?: V4Plugin[]
}

/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: CreateServerHeadOptions = {}): VueHeadClient {
  const head = _createHead({ disableDefaults: options.disableDefaults }) as VueHeadClient
  const compile = head._compile
  head._compile = (input, seq, opts) => {
    const resolved = walkResolver(input, VueResolver) || {}
    const transform = (opts as EntryOptions & { _v?: (input: Record<string, any>) => Record<string, any> } | null)?._v
    return compile(transform ? transform(resolved) : resolved, seq, opts)
  }
  if (options.plugins) {
    for (const p of options.plugins) head.use(p)
  }
  head.install = vueInstall(head)
  return head
}

/**
 * v4's renderSSRHead with the v3 payload contract: same 5-field shape, tags
 * joined with newlines unless `omitLineBreaks` (Nuxt splices the payload
 * straight into its template, and v3 emitted newline-separated tags).
 */
export function renderSSRHead(head: V4Head, options?: RenderSSRHeadOptions): SSRHeadPayload {
  const sep = options?.omitLineBreaks ? '' : '\n'
  const tags = head.resolve()
  const buckets = ['', '', ''] // head, bodyOpen, bodyClose
  const bags: (Record<string, any> | null)[] = [null, null]

  for (let i = 0; i < tags.length; i++) {
    const t: Tag = tags[i]
    const f = t.f
    if (f & F_REMOVED)
      continue
    const id = f & F_ID

    if (id === T_HTML_ATTRS || id === T_BODY_ATTRS) {
      const bag = bags[id - T_HTML_ATTRS] ||= {}
      let p = t.p
      if (f & F_PREBUILT) {
        // plan attr fragments are single-attr strings (wire contract); parse
        // the prop back out so prebuilt and runtime attrs merge in one bag
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

    const html = f & F_PREBUILT ? t.c! : tagToHtml(t)
    const pos = (f & F_POS) >> POS_SHIFT
    buckets[pos] += buckets[pos] ? sep + html : html
  }

  return {
    headTags: buckets[0],
    bodyTags: buckets[2],
    bodyTagsOpen: buckets[1],
    htmlAttrs: bags[0] ? propsToString(bags[0]) : '',
    bodyAttrs: bags[1] ? propsToString(bags[1]) : '',
  }
}
