import type { CreateServerHeadOptions, Unhead } from 'unhead/types'
import { createHead as _createHead } from 'unhead/server'

export { UnheadContextKey } from './context'

export function createHead(options: CreateServerHeadOptions = {}): Unhead {
  return _createHead(options)
}

export { extractUnheadInputFromHtml, renderSSRHead, type SSRHeadPayload, transformHtmlTemplate } from 'unhead/server'
