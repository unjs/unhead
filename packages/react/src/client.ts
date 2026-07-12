import type { ReactElement, ReactNode } from 'react'
import type { ClientUnhead } from 'unhead/client'
import type { CompatibleHead, CreateClientHeadOptions as CoreCreateClientHeadOptions, HeadRenderer, ResolvableHead, Unhead, UseHeadInput } from 'unhead/types'
import { createElement, useRef } from 'react'
import { createHead as _createHead, createDebouncedFn, createDomRenderer } from 'unhead/client'
import { toUnheadContextValue, UnheadContext } from './context'

export { renderDOMHead } from 'unhead/client'

export type CreateClientHeadOptions<I = UseHeadInput, RenderResult = void> = CoreCreateClientHeadOptions<I, RenderResult>

type CustomClientHeadOptions<I, RenderResult> = Omit<CreateClientHeadOptions<I, RenderResult>, 'render'> & { render: HeadRenderer<RenderResult, I> }
type DefaultClientHeadOptions<I> = Omit<CreateClientHeadOptions<I, void>, 'render'> & { render?: undefined }
type HeadRendererContext<I> = Omit<Unhead<I, never>, 'hooks' | 'plugins' | 'render' | 'use'> & { render: () => unknown }
type InferableHeadRenderer<I, RenderResult = unknown> = (head: HeadRendererContext<I>) => RenderResult
const createCoreHead: <I, RenderResult>(options: CustomClientHeadOptions<I, RenderResult>) => ClientUnhead<I, RenderResult> = _createHead

export function createHead<Renderer extends InferableHeadRenderer<UseHeadInput> = InferableHeadRenderer<UseHeadInput>>(options: Omit<CreateClientHeadOptions<UseHeadInput, ReturnType<Renderer>>, 'render'> & { render: Renderer }): ClientUnhead<UseHeadInput, ReturnType<Renderer>>
export function createHead<I = UseHeadInput, Renderer extends InferableHeadRenderer<I> = InferableHeadRenderer<I>>(options: Omit<CreateClientHeadOptions<I, ReturnType<Renderer>>, 'render'> & { render: Renderer }): ClientUnhead<I, ReturnType<Renderer>>
export function createHead<I = UseHeadInput, RenderResult = unknown>(options: CustomClientHeadOptions<I, RenderResult>): ClientUnhead<I, RenderResult>
export function createHead(options?: DefaultClientHeadOptions<UseHeadInput>): ClientUnhead<UseHeadInput, void>
export function createHead<I = UseHeadInput>(options?: DefaultClientHeadOptions<I>): ClientUnhead<I, void>
export function createHead<I = UseHeadInput>(options: CreateClientHeadOptions<I, void>): ClientUnhead<I, void>
export function createHead<I = UseHeadInput, RenderResult = unknown>(options: CustomClientHeadOptions<I, RenderResult> | DefaultClientHeadOptions<I> = {}): ClientUnhead<I, RenderResult> | ClientUnhead<I, void> {
  const domRenderer = createDomRenderer()
  if (options.render) {
    return createCoreHead(options)
  }

  const { render: _, ...rest } = options
  let head: ClientUnhead<I, void>
  const debouncedRenderer = createDebouncedFn(() => domRenderer(head), fn => setTimeout(fn, 0))
  head = createCoreHead<I, void>({ ...rest, render: debouncedRenderer })
  return head
}

export interface UnheadProviderProps<I = UseHeadInput, RenderResult = unknown> {
  children: ReactNode
  head?: CompatibleHead<I, ResolvableHead, RenderResult>
}

export function UnheadProvider<I = UseHeadInput, RenderResult = unknown>({ children, head }: UnheadProviderProps<I, RenderResult>): ReactElement {
  const headRef = useRef<ClientUnhead<I, void> | null>(null)
  if (!head && !headRef.current)
    headRef.current = createHead<I>()
  const contextHead = head
    ? toUnheadContextValue(head)
    : toUnheadContextValue(headRef.current!)
  return createElement(UnheadContext.Provider, { value: contextHead }, children)
}

export type {
  Unhead,
}
