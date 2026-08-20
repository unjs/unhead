import type { ClientHeadHooks, CreateClientHeadOptions, HeadRenderer, HeadTag, ResolvableHead, Unhead } from '../types'
import type { ClientUnhead } from './adapter'
import { createUnhead } from '../unhead'
import { TagPriorityAliases } from '../utils/const'
import { createHooks } from '../utils/hooks'
import { createClientHeadAdapter } from './adapter'
import { createDomRenderer } from './renderDOMHead'

export type { ClientUnhead } from './adapter'

const tagWeight = (tag: HeadTag) => typeof tag.tagPriority === 'number' ? tag.tagPriority : 100 + ((TagPriorityAliases as Record<string, number>)[tag.tagPriority as string] || 0)

type ClientHeadOptionsWithRenderer<Input, RenderResult> = Omit<CreateClientHeadOptions<Input, RenderResult>, 'render'> & {
  render: HeadRenderer<RenderResult, Input>
}

type HeadRendererContext<Input> = Omit<Unhead<Input, never>, 'hooks' | 'plugins' | 'render' | 'use'> & { render: () => unknown }
type InferableHeadRenderer<Input, RenderResult = unknown> = (head: HeadRendererContext<Input>) => RenderResult

export function createHead<Renderer extends InferableHeadRenderer<ResolvableHead> = InferableHeadRenderer<ResolvableHead>>(options: Omit<CreateClientHeadOptions<ResolvableHead, ReturnType<Renderer>>, 'render'> & { render: Renderer }): ClientUnhead<ResolvableHead, ReturnType<Renderer>>
export function createHead<T = ResolvableHead, Renderer extends InferableHeadRenderer<T> = InferableHeadRenderer<T>>(options: Omit<CreateClientHeadOptions<T, ReturnType<Renderer>>, 'render'> & { render: Renderer }): ClientUnhead<T, ReturnType<Renderer>>
export function createHead<T = ResolvableHead, RenderResult = unknown>(options: ClientHeadOptionsWithRenderer<T, RenderResult>): ClientUnhead<T, RenderResult>
export function createHead(options?: CreateClientHeadOptions<ResolvableHead, boolean>): ClientUnhead<ResolvableHead, boolean>
export function createHead<T = ResolvableHead>(options?: CreateClientHeadOptions<T, boolean>): ClientUnhead<T, boolean>
export function createHead(options: object = {}): unknown {
  const resolvedOptions = options as CreateClientHeadOptions<unknown, unknown>
  resolvedOptions.document = resolvedOptions.document || (typeof window !== 'undefined' ? document : undefined)
  const renderer = resolvedOptions.render || createDomRenderer({ document: resolvedOptions.document })
  const core = createUnhead<unknown, unknown>(renderer, { document: resolvedOptions.document, propResolvers: resolvedOptions.propResolvers, _tagWeight: tagWeight, init: [] })
  const hooks = createHooks<ClientHeadHooks<unknown, unknown>>(resolvedOptions.hooks)
  const head = createClientHeadAdapter(core, hooks, renderer)
  resolvedOptions.plugins?.forEach(p => head.use(p))
  resolvedOptions.init?.forEach(e => e && head.push(e))
  return head
}
