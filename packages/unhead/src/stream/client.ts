import type { ClientUnhead } from '../client/adapter'
import type { ClientHeadHooks, CreateClientHeadOptions, ResolvableHead, Unhead } from '../types'
import type { StreamingGlobal, UnheadStreamQueue } from './types'
import { createClientHeadAdapter } from '../client/adapter'
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
  const streamQueue = win?.[streamKey] as UnheadStreamQueue | undefined
  const core = streamQueue?._head as Unhead<Input, boolean> | undefined

  if (!core)
    return undefined

  // Already wrapped, by an earlier call or by a client bundle that built the
  // head itself. Re-wrapping would double every push, so apply what this call
  // brought and hand the existing head back. The old early return dropped
  // `hooks`, `plugins`, and `init` on the floor.
  if ((core as WrappedStreamHead<Input>)._wrapped) {
    const wrapped = core as ClientUnhead<Input>
    for (const name in rest.hooks || {})
      wrapped.hooks?.hook(name as any, (rest.hooks as any)[name])
    ;(rest.plugins || []).forEach(p => wrapped.use(p))
    rest.init?.forEach(e => e && wrapped.push(e))
    return wrapped
  }

  const coreRender = core.render
  const hooks = createHooks<ClientHeadHooks<Input, boolean>>(rest.hooks)
  const head = createClientHeadAdapter(core, hooks, () => coreRender())

  // Mark as wrapped to avoid double-wrapping
  ;(head as WrappedStreamHead<Input>)._wrapped = true

  // Register plugins
  ;(rest.plugins || []).forEach(p => head.use(p))

  // Push init entries
  rest.init?.forEach(e => e && head.push(e))

  // Update the stream queue to use the wrapped head
  if (streamQueue)
    streamQueue._head = head

  return head
}
