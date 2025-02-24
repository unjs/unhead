import type { ReactNode } from 'react'
import type { Unhead } from 'unhead/types'
import { createElement } from 'react'
import { UnheadContext } from './context'

export { createHead, extractUnheadInputFromHtml, renderSSRHead, type SSRHeadPayload, transformHtmlTemplate } from 'unhead/server'

export function UnheadProvider({ children, value }: { children: ReactNode, value: Unhead }) {
  return createElement(UnheadContext.Provider, { value }, children)
}
