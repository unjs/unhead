import type { ClientUnhead } from '../client/adapter'
import type { ClientHeadHooks, CreateClientHeadOptions, ResolvableHead, Unhead } from '../types'
import type { StreamingGlobal, UnheadStreamQueue } from './types'
import { createClientHeadAdapter } from '../client/adapter'
import { createHooks } from '../utils/hooks'

export type { StreamingGlobal, UnheadStreamQueue }

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

  // Already wrapped, by an earlier call or by a client bundle that built the
  // head itself. Re-wrapping would double every push, so apply what this call
  // brought and hand the existing head back. The old early return dropped
  // `hooks`, `plugins`, and `init` on the floor.
  if ((core as any)._wrapped) {
    const wrapped = core as ClientUnhead<T>
    for (const name in rest.hooks || {})
      wrapped.hooks?.hook(name as any, (rest.hooks as any)[name])
    ;(rest.plugins || []).forEach(p => wrapped.use(p))
    rest.init?.forEach(e => e && wrapped.push(e as T))
    return wrapped
  }

  const coreRender = core.render
  const hooks = createHooks<ClientHeadHooks>(rest.hooks)
  const head = createClientHeadAdapter(core as Unhead<T, boolean>, hooks, () => coreRender() as boolean)

  // Mark as wrapped to avoid double-wrapping
  ;(head as any)._wrapped = true

  // Register plugins
  ;(rest.plugins || []).forEach(p => head.use(p))

  // Push init entries
  rest.init?.forEach(e => e && head.push(e as T))

  // Update the stream queue to use the wrapped head
  if (streamQueue)
    streamQueue._head = head as Unhead<any>

  return head
}
