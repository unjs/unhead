import type { RenderDomHeadOptions, Unhead } from '../types'
import { renderDOMHead as _renderDOMHead } from './renderDOMHead'

export type {
  CreateClientHeadOptions,
  Unhead,
} from '../types'
export { createHead } from './createHead'
export { createDomRenderer } from './renderDOMHead'
export { createDebouncedFn } from './util'

/** @deprecated Use `head.render()` instead */
export function renderDOMHead(head: Unhead<any>, options?: RenderDomHeadOptions): boolean {
  return _renderDOMHead(head, options)
}
