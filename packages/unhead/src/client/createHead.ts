import type { HookableCore } from 'hookable'
import type { ClientHeadHooks, CreateClientHeadOptions, HeadEntryOptions, HeadRenderer, HeadTag, ResolvableHead, Unhead } from '../types'
import { createUnhead, registerPlugin } from '../unhead'
import { createHooks } from '../utils/hooks'
import { createDomRenderer } from './renderDOMHead'

const PriorityAliases: Record<string, number> = { critical: -8, high: -1, low: 2 }

function tagWeight(tag: HeadTag) {
  return typeof tag.tagPriority === 'number'
    ? tag.tagPriority
    : 100 + (PriorityAliases[tag.tagPriority as string] || 0)
}

export interface ClientUnhead<T = ResolvableHead> extends Unhead<T, boolean> {
  hooks: HookableCore<ClientHeadHooks>
  dirty: boolean
  invalidate: () => void
}

export function createHead<T = ResolvableHead>(options: CreateClientHeadOptions = {}): ClientUnhead<T> {
  options.document = options.document || (typeof window !== 'undefined' ? document : undefined)
  const renderer = (options.render || createDomRenderer({ document: options.document })) as HeadRenderer<boolean>
  const initialPayload = options.document?.head.querySelector('script[id="unhead:payload"]')?.innerHTML || false

  const core = createUnhead<T, boolean>(renderer, {
    document: options.document,
    propResolvers: options.propResolvers,
    _tagWeight: tagWeight,
    init: [], // push on wrapped head instead
  })

  const hooks = createHooks<ClientHeadHooks>(options.hooks)
  let dirty = false

  const head: ClientUnhead<T> = {
    ...core,
    ssr: false,
    hooks,
    use: p => registerPlugin(head, p),
    get dirty() { return dirty },
    set dirty(v) { dirty = v },
    render: () => renderer(head),
    invalidate() {
      for (const entry of core.entries.values())
        delete entry._tags
      dirty = true
      hooks.callHook('entries:updated', head)
    },
    push(input: T, _options?: HeadEntryOptions) {
      const active = core.push(input, _options)
      core.entries.get(active._i)!._o = input
      dirty = true
      hooks.callHook('entries:updated', head)
      return {
        _i: active._i,
        patch(input: T) {
          active.patch(input)
          dirty = true
          hooks.callHook('entries:updated', head)
        },
        dispose() {
          if (core.entries.has(active._i)) {
            active.dispose()
            head.invalidate()
          }
        },
      }
    },
  }

  hooks.hook('entries:updated', () => {
    renderer(head)
  })
  options.plugins?.forEach(p => registerPlugin(head, p))
  initialPayload && head.push(JSON.parse(initialPayload) as T)
  options.init?.forEach(e => e && head.push(e as T))

  return head
}
