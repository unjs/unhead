import type { ClientUnhead } from '../client/adapter'
import type { ClientHeadHooks, CreateClientHeadOptions, ResolvableHead, Unhead } from '../types'
import type { StreamingGlobal, UnheadStreamQueue } from './types'
import { createStreamClientHeadAdapter } from '../client/adapter'
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

  // Check if hydration is locked (client pushes should be skipped during hydration)
  const isHydrationLocked = () => streamQueue?._hydrationLocked?.() ?? false
  const coreRender = core.render
  const hooks = createHooks<ClientHeadHooks<Input, boolean>>(rest.hooks)
  const head = createStreamClientHeadAdapter(core, hooks, () => coreRender(), isHydrationLocked)

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
