/**
 * SSR page fixtures for the hydration exploration: render the 7-entry typical
 * page (bench/v4/fixtures.ts applyPage) through each server flavor and wrap
 * it into a full document string for JSDOM.
 */
import type { V4Head } from '../../../packages/unhead/src/v4/core'
import type { SSRPayload } from '../../../packages/unhead/src/v4/server'
import { createHead as createV3Server, renderSSRHead as renderV3SSRHead } from '../../../packages/unhead/src/server'
import { createHead as createV4Server, renderSSRHead } from '../../../packages/unhead/src/v4/server'
import { applyPage } from '../../v4/fixtures'

export interface SSRPage {
  html: string
  headInner: string
  bodyInner: string
  bytes: number
}

/** identity-gap probes: base, alternate+hreflang, keyed meta */
export const EDGE_ENTRY = {
  base: { href: '/app/' },
  link: [{ rel: 'alternate', hreflang: 'en', href: 'https://example.com/en' }],
  meta: [{ name: 'x-custom', content: 'a', key: 'custom' }],
}

const APP_HTML = '<div id="app"><h1>hello</h1></div>'

function buildPage(payload: SSRPayload): SSRPage {
  const bodyInner = `${payload.bodyTagsOpen}${APP_HTML}${payload.bodyTags}`
  const html = `<!DOCTYPE html><html${payload.htmlAttrs}><head>${payload.headTags}</head><body${payload.bodyAttrs}>${bodyInner}</body></html>`
  return { html, headInner: payload.headTags, bodyInner, bytes: html.length }
}

export function v4SSRPage(render: (head: V4Head) => SSRPayload = renderSSRHead, extra?: Record<string, any>): SSRPage {
  const head = createV4Server()
  applyPage((input, opts) => head.push(input, opts))
  if (extra)
    head.push(extra)
  return buildPage(render(head))
}

export function v3SSRPage(): SSRPage {
  const head = createV3Server()
  applyPage((input, opts) => head.push(input, opts))
  return buildPage(renderV3SSRHead(head) as SSRPayload)
}

/** per-iteration reset: restore the SSR-rendered head/body markup */
export function resetDoc(doc: Document, page: SSRPage) {
  doc.head.innerHTML = page.headInner
  doc.body.innerHTML = page.bodyInner
}
