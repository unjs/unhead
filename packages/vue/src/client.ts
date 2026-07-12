import type { ClientUnhead } from 'unhead/client'
import type { CreateClientHeadOptions as CoreCreateClientHeadOptions, HeadRenderer, Unhead } from 'unhead/types'
import type { UseHeadInput, VueHeadClient } from './types'
import { createHead as _createHead, createDomRenderer } from 'unhead/client'
import { vueInstall } from './install'

export { VueHeadMixin } from './VueHeadMixin'
export { renderDOMHead } from 'unhead/client'

export type CreateClientHeadOptions<I = UseHeadInput, RenderResult = void> = CoreCreateClientHeadOptions<I, RenderResult>

type CustomClientHeadOptions<I, RenderResult> = Omit<CreateClientHeadOptions<I, RenderResult>, 'render'> & { render: HeadRenderer<RenderResult, I> }
type DefaultClientHeadOptions<I> = Omit<CreateClientHeadOptions<I, void>, 'render'> & { render?: undefined }
type HeadRendererContext<I> = Omit<Unhead<I, never>, 'hooks' | 'plugins' | 'render' | 'use'> & { render: () => unknown }
type InferableHeadRenderer<I, RenderResult = unknown> = (head: HeadRendererContext<I>) => RenderResult
const createCoreHead: <I, RenderResult>(options: CustomClientHeadOptions<I, RenderResult>) => ClientUnhead<I, RenderResult> = _createHead

function withVueInstall<I, RenderResult>(head: ClientUnhead<I, RenderResult>): VueHeadClient<I, RenderResult> {
  return Object.assign(head, { install: vueInstall(head) })
}

/* @__NO_SIDE_EFFECTS__ */
export function createHead<Renderer extends InferableHeadRenderer<UseHeadInput> = InferableHeadRenderer<UseHeadInput>>(options: Omit<CreateClientHeadOptions<UseHeadInput, ReturnType<Renderer>>, 'render'> & { render: Renderer }): VueHeadClient<UseHeadInput, ReturnType<Renderer>>
export function createHead<I = UseHeadInput, Renderer extends InferableHeadRenderer<I> = InferableHeadRenderer<I>>(options: Omit<CreateClientHeadOptions<I, ReturnType<Renderer>>, 'render'> & { render: Renderer }): VueHeadClient<I, ReturnType<Renderer>>
export function createHead<I = UseHeadInput, RenderResult = unknown>(options: CustomClientHeadOptions<I, RenderResult>): VueHeadClient<I, RenderResult>
export function createHead(options?: DefaultClientHeadOptions<UseHeadInput>): VueHeadClient<UseHeadInput, void>
export function createHead<I = UseHeadInput>(options?: DefaultClientHeadOptions<I>): VueHeadClient<I, void>
export function createHead<I = UseHeadInput>(options: CreateClientHeadOptions<I, void>): VueHeadClient<I, void>
export function createHead<I = UseHeadInput, RenderResult = unknown>(options: CustomClientHeadOptions<I, RenderResult> | DefaultClientHeadOptions<I> = {}): VueHeadClient<I, RenderResult> | VueHeadClient<I, void> {
  const domRenderer = createDomRenderer()
  if (options.render) {
    return withVueInstall(createCoreHead(options))
  }

  const { render: _, ...rest } = options
  let head: VueHeadClient<I, void>
  let renderId = 0
  const debouncedRenderer = () => {
    const id = ++renderId
    setTimeout(() => {
      if (id === renderId)
        domRenderer(head)
    }, 0)
  }
  head = withVueInstall(createCoreHead<I, void>({ ...rest, render: debouncedRenderer }))
  return head
}

export type {
  VueHeadClient,
}
