import type { ClientHeadHooks, CreateClientHeadOptions, HeadRenderer, HeadTag, ResolvableHead } from '../types'
import type { ClientUnhead } from './adapter'
import { createUnhead } from '../unhead'
import { TagPriorityAliases } from '../utils/const'
import { createHooks } from '../utils/hooks'
import { createPropResolver } from '../utils/normalize'
import { createClientHeadAdapter } from './adapter'
import { createDomRenderer } from './renderDOMHead'

export type { ClientUnhead } from './adapter'

const tagWeight = (tag: HeadTag) => typeof tag.tagPriority === 'number' ? tag.tagPriority : 100 + ((TagPriorityAliases as Record<string, number>)[tag.tagPriority as string] || 0)

export function createHead<T = ResolvableHead>(options: CreateClientHeadOptions = {}): ClientUnhead<T> {
  options.document = options.document || (typeof window !== 'undefined' ? document : undefined)
  const renderer = (options.render || createDomRenderer({ document: options.document })) as HeadRenderer<boolean>
  const propResolvers = [...(options.propResolvers || [])]
  const core = createUnhead<T, boolean>(renderer, { document: options.document, propResolvers, _propResolver: { resolve: createPropResolver(propResolvers, false), source: propResolvers }, _tagWeight: tagWeight, init: [] })
  const hooks = createHooks<ClientHeadHooks>(options.hooks)
  const head = createClientHeadAdapter(core, hooks, renderer)
  options.plugins?.forEach(p => head.use(p))
  options.init?.forEach(e => e && head.push(e as T))
  return head
}
