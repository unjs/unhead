import type { ReactNode } from 'react'
import type { Unhead } from 'unhead/types'
import { createElement } from 'react'
import { UnheadContext } from './context'

export { createHead, type PreparedTemplate, prepareTemplate, renderSSRHead, transformHtmlTemplate } from 'unhead/server'

export interface UnheadProviderProps {
  children: ReactNode
  value: Unhead
}

export function UnheadProvider({ children, value }: UnheadProviderProps) {
  return createElement(UnheadContext.Provider, { value }, children)
}

export type {
  CreateServerHeadOptions,
  SSRHeadPayload,
  Unhead,
} from 'unhead/types'
