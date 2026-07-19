import type { ReactElement, ReactNode } from 'react'
import type { CompatibleHead, ResolvableHead, Unhead, UseHeadInput } from 'unhead/types'
import { createElement } from 'react'
import { UnheadContext } from './context'

export { createHead, type PreparedTemplate, prepareTemplate, renderSSRHead, transformHtmlTemplate } from 'unhead/server'

export interface UnheadProviderProps<I = UseHeadInput, RenderResult = unknown> {
  children: ReactNode
  value: CompatibleHead<I, ResolvableHead, RenderResult>
}

export function UnheadProvider<I = UseHeadInput, RenderResult = unknown>({ children, value }: UnheadProviderProps<I, RenderResult>): ReactElement {
  return createElement(UnheadContext.Provider, { value: value as unknown as Unhead }, children)
}

export type {
  CreateServerHeadOptions,
  SSRHeadPayload,
  Unhead,
} from 'unhead/types'
