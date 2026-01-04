import type { RenderSSRHeadOptions, SSRHeadPayload, Unhead } from '../types'
import { renderSSRHead as _renderSSRHead } from './renderSSRHead'

export type { CreateServerHeadOptions, SSRHeadPayload, Unhead } from '../types'
export { createHead } from './createHead'
export { createServerRenderer } from './renderSSRHead'
export { capoTagWeight } from './sort'
export { transformHtmlTemplate, transformHtmlTemplateRaw } from './transformHtmlTemplate'
export { escapeHtml, propsToString, ssrRenderTags, tagToString } from './util'

/** @deprecated Use `head.render()` instead */
export function renderSSRHead(head: Unhead<any>, options?: RenderSSRHeadOptions): SSRHeadPayload {
  return _renderSSRHead(head, options)
}
