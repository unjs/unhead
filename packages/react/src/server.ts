import type { ReactElement } from 'react'
import type { UseHeadInput } from 'unhead/types'
import type { UniversalUnheadProviderProps } from './context'
import { createElement } from 'react'
import { toUnheadContextValue, UnheadContext } from './context'

export { createHead, type PreparedTemplate, prepareTemplate, renderSSRHead, transformHtmlTemplate } from 'unhead/server'

export type UnheadProviderProps<I = UseHeadInput, RenderResult = unknown> = UniversalUnheadProviderProps<I, RenderResult>

export function UnheadProvider<I = UseHeadInput, RenderResult = unknown>({ children, value }: UnheadProviderProps<I, RenderResult>): ReactElement {
  return createElement(UnheadContext.Provider, { value: toUnheadContextValue(value) }, children)
}

export type {
  CreateServerHeadOptions,
  SSRHeadPayload,
  Unhead,
} from 'unhead/types'
