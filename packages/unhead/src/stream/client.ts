import type { ClientUnhead } from '../client/createHead'
import type { ActiveHeadEntry, ClientHeadHooks, CreateClientHeadOptions, HeadEntryOptions, ResolvableHead, SerializableHead, Unhead } from '../types'
import { registerPlugin } from '../unhead'
import { createHooks } from '../utils/hooks'

export interface UnheadStreamQueue {
  _q: SerializableHead[][]
  _head?: Unhead<any>
  push: (entries: SerializableHead[]) => void
}

export const DEFAULT_STREAM_KEY = '__unhead__'

export interface CreateStreamableClientHeadOptions extends Omit<CreateClientHeadOptions, 'render'> {
  streamKey?: string
}

/**
 * Creates a client head by wrapping the core instance from the iife script.
 * Adds hooks, plugins, and dirty tracking without bundling createDomRenderer.
 */
export function createStreamableHead<T = ResolvableHead>(options: CreateStreamableClientHeadOptions = {}): ClientUnhead<T> | undefined {
  const { streamKey = DEFAULT_STREAM_KEY, ...rest } = options
  const win = typeof window !== 'undefined' ? window as any : undefined
  const streamQueue = win?.[streamKey] as UnheadStreamQueue | undefined
  const core = streamQueue?._head as Unhead<T> | undefined

  if (!core)
    return undefined

  // Check if already wrapped
  if ((core as any)._wrapped)
    return core as ClientUnhead<T>

  const hooks = createHooks<ClientHeadHooks>(rest.hooks)

  // Cast core since iife adds dirty property dynamically
  const coreWithDirty = core as Unhead<T> & { dirty: boolean }

  const head: ClientUnhead<T> = {
    ...coreWithDirty,
    hooks,
    use: p => registerPlugin(head, p),
    render(): boolean {
      return core.render() as boolean
    },
    invalidate() {
      for (const entry of core.entries.values()) {
        entry._dirty = true
      }
      coreWithDirty.dirty = true
      hooks.callHook('entries:updated', head)
    },
    push(input: T, _options?: HeadEntryOptions) {
      const active = core.push(input, _options)
      const entry = core.entries.get(active._i)
      if (entry)
        entry._dirty = true
      coreWithDirty.dirty = true
      hooks.callHook('entries:updated', head)

      const corePatch = active.patch
      const coreDispose = active.dispose

      const clientActive: ActiveHeadEntry<T> = {
        _i: active._i,
        patch(input) {
          corePatch(input)
          const e = core.entries.get(active._i)
          if (e)
            e._dirty = true
          coreWithDirty.dirty = true
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

  // Mark as wrapped to avoid double-wrapping
  ;(head as any)._wrapped = true

  // Register plugins
  ;(rest.plugins || []).forEach(p => registerPlugin(head, p))

  // Auto-render on entries:updated
  registerPlugin(head, {
    key: 'client',
    hooks: {
      'entries:updated': () => { head.render() },
    },
  })

  // Push init entries
  const initialPayload = rest.document?.head.querySelector('script[id="unhead:payload"]')?.innerHTML || false
  const initEntries = [
    initialPayload ? JSON.parse(initialPayload) : false,
    ...(rest.init || []),
  ]
  initEntries.forEach(e => e && head.push(e as T))

  // Update the stream queue to use the wrapped head
  if (streamQueue)
    streamQueue._head = head as Unhead<any>

  return head
}
