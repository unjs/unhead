import type { HookableCore } from 'hookable'
import type { ActiveHeadEntry, ClientHeadHooks, CreateClientHeadOptions, HeadEntryOptions, HeadRenderer, HeadTag, ResolvableHead, Unhead } from '../types'
import { createUnhead, registerPlugin } from '../unhead'
import { TagPriorityAliases } from '../utils/const'
import { createHooks } from '../utils/hooks'
import { createDomRenderer } from './renderDOMHead'

function tagWeight(tag: HeadTag) {
  return typeof tag.tagPriority === 'number'
    ? tag.tagPriority
    : 100 + (TagPriorityAliases[tag.tagPriority as keyof typeof TagPriorityAliases] || 0)
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
    hooks,
    use: p => registerPlugin(head, p),
    get dirty() { return dirty },
    set dirty(v) { dirty = v },
    render() {
      return renderer(head)
    },
    invalidate() {
      for (const entry of core.entries.values()) {
        entry._dirty = true
      }
      dirty = true
      hooks.callHook('entries:updated', head)
    },
    push(input: T, _options?: HeadEntryOptions) {
      const active = core.push(input, _options)
      const entry = core.entries.get(active._i)!
      entry._dirty = true
      dirty = true
      hooks.callHook('entries:updated', head)

      const corePatch = active.patch
      const coreDispose = active.dispose

      const clientActive: ActiveHeadEntry<T> = {
        _i: active._i,
        patch(input) {
          corePatch(input)
          entry._dirty = true
          dirty = true
          hooks.callHook('entries:updated', head)
        },
        dispose() {
          if (core.entries.has(active._i)) {
            coreDispose()
            head.invalidate()
          }
        },
      }
      return clientActive
    },
  }

  // register plugins on wrapped head
  ;(options.plugins || []).forEach(p => registerPlugin(head, p))

  // auto-render on entries:updated
  registerPlugin(head, {
    key: 'client',
    hooks: {
      'entries:updated': () => { head.render() },
    },
  })

  // push init entries
  const initEntries = [
    initialPayload ? JSON.parse(initialPayload) : false,
    ...(options.init || []),
  ]
  initEntries.forEach(e => e && head.push(e as T))

  return head
}
