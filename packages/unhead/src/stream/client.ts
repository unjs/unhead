import type { ClientUnhead } from '../client/createHead'
import type { ActiveHeadEntry, ClientHeadHooks, CreateClientHeadOptions, HeadEntryOptions, ResolvableHead, Unhead } from '../types'
import type { StreamingGlobal, UnheadStreamQueue } from './types'
import { registerPlugin } from '../unhead'
import { createHooks } from '../utils/hooks'

export type { StreamingGlobal, UnheadStreamQueue }

export const DEFAULT_STREAM_KEY = '__unhead__'

export interface CreateStreamableClientHeadOptions<Input = never> extends Omit<CreateClientHeadOptions<Input | ResolvableHead, boolean>, 'render'> {
  streamKey?: string
}

type WrappedStreamHead<Input> = ClientUnhead<Input> & { _wrapped?: boolean }

/**
 * Creates a client head by wrapping the core instance from the iife script.
 * Adds hooks, plugins, and dirty tracking without bundling createDomRenderer.
 */
export function createStreamableHead(options?: CreateStreamableClientHeadOptions): ClientUnhead<ResolvableHead> | undefined
export function createStreamableHead<T = never>(options?: CreateStreamableClientHeadOptions<T>): ClientUnhead<T | ResolvableHead> | undefined
export function createStreamableHead<T = never>(options: CreateStreamableClientHeadOptions<T> = {}): ClientUnhead<T | ResolvableHead> | undefined {
  type Input = T | ResolvableHead
  const { streamKey = DEFAULT_STREAM_KEY, ...rest } = options
  const win = typeof window !== 'undefined' ? window as unknown as Window & Record<string, unknown> : undefined
  const streamQueue = win?.[streamKey] as UnheadStreamQueue & { _hydrationLocked?: () => boolean } | undefined
  const core = streamQueue?._head as Unhead<Input, boolean> | undefined

  if (!core)
    return undefined

  // Check if already wrapped
  if ((core as WrappedStreamHead<Input>)._wrapped)
    return core as ClientUnhead<Input>

  const hooks = createHooks<ClientHeadHooks<Input, boolean>>(rest.hooks)

  // Cast core since iife adds dirty property dynamically
  const coreWithDirty = core as Unhead<Input, boolean> & { dirty: boolean }

  // Check if hydration is locked (client pushes should be skipped during hydration)
  const isHydrationLocked = () => streamQueue?._hydrationLocked?.() ?? false

  const head: ClientUnhead<Input> = {
    ...coreWithDirty,
    hooks,
    use: p => registerPlugin(head, p),
    render(): boolean {
      return core.render() as boolean
    },
    invalidate() {
      for (const entry of core.entries.values())
        delete entry._tags
      coreWithDirty.dirty = true
      hooks.callHook('entries:updated', head)
    },
    push(input: Input, _options?: HeadEntryOptions<Input>) {
      // Skip pushes during hydration to preserve SSR-streamed state
      // After hydration completes (microtask), pushes are allowed again
      if (isHydrationLocked()) {
        // Return a no-op entry during hydration
        return {
          _i: -1,
          patch: () => {},
          dispose: () => {},
        } as ActiveHeadEntry<Input>
      }

      const active = core.push(input, _options)
      const entry = core.entries.get(active._i)
      if (entry)
        entry._o = input
      coreWithDirty.dirty = true
      hooks.callHook('entries:updated', head)

      const coreDispose = active.dispose

      return {
        _i: active._i,
        patch(input: Input) {
          if (isHydrationLocked())
            return
          active.patch(input)
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
    },
  }

  // Mark as wrapped to avoid double-wrapping
  ;(head as WrappedStreamHead<Input>)._wrapped = true

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
  rest.init?.forEach(e => e && head.push(e))

  // Update the stream queue to use the wrapped head
  if (streamQueue)
    streamQueue._head = head

  return head
}
