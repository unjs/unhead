import type {
  ActiveHeadEntry,
  CreateHeadOptions,
  Head,
  HeadEntryOptions,
  HeadSafe,
  MergeHead,
  Unhead,
  UseSeoMetaInput,
} from '@unhead/schema'
import { IsBrowser, unpackMeta, whitelistSafeInput } from '@unhead/shared'
import { DomPlugin } from '../client/plugins/domPlugin'
import { ClientEventHandlerPlugin } from '../client/plugins/eventHandlers'
import { tryUseUnhead, unheadCtx } from '../context'
import { createHeadCore } from '../createHead'
import { DeprecationsPlugin } from '../plugins/deprecations'
import { PromisesPlugin } from '../plugins/promises'
import { ServerEventHandlerPlugin } from '../server/plugins/eventHandlers'
import { PayloadPlugin } from '../server/plugins/payload'

export * from '../context'
export * from './useScript'

export function createServerHead<T extends Record<string, any> = Head>(options: CreateHeadOptions = {}) {
  return createHeadCore<T>({
    disableCapoSorting: true,
    ...options,
    // @ts-expect-error untyped
    document: false,
    plugins: [
      ...(options.plugins || []),
      DomPlugin(),
      DeprecationsPlugin,
      PromisesPlugin,
      ServerEventHandlerPlugin,
      PayloadPlugin,
    ],
  })
}

export function createHead<T extends Record<string, any> = Head>(options: CreateHeadOptions = {}) {
  const head = createHeadCore<T>({ disableCapoSorting: true, ...options, plugins: [
    ...(options.plugins || []),
    DomPlugin(),
    DeprecationsPlugin,
    PromisesPlugin,
    ClientEventHandlerPlugin,
  ] })
  // should only be one instance client-side
  if (!head.ssr && IsBrowser) {
    unheadCtx.set(head, true)
  }
  return head
}

export function getActiveHead() {
  return tryUseUnhead()
}

export type UseHeadInput<T extends MergeHead> = Head<T>

export function useHead<T extends MergeHead>(input: UseHeadInput<T>, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadInput<T>> | void {
  const head = (options.head || getActiveHead()) as any as Unhead<UseHeadInput<T>>
  if (head) {
    return head.push(input, options)
  }
}

export function useHeadSafe(input: HeadSafe, options?: HeadEntryOptions): ActiveHeadEntry<HeadSafe> | void {
  // @ts-expect-error untyped
  return useHead(input, {
    ...options,
    transform: whitelistSafeInput,
  })
}

export function useSeoMeta(input: UseSeoMetaInput, options?: HeadEntryOptions): ActiveHeadEntry<any> | void {
  const { title, titleTemplate, ...meta } = input
  return useHead({
    title,
    titleTemplate,
    // we need to input the meta so the reactivity will be resolved
    // @ts-expect-error runtime type
    _flatMeta: meta,
  }, {
    ...options,
    transform(t) {
      // @ts-expect-error runtime type
      const meta = unpackMeta({ ...t._flatMeta })
      // @ts-expect-error runtime type
      delete t._flatMeta
      return {
        // @ts-expect-error runtime type
        ...t,
        meta,
      }
    },
  })
}

export function useServerHead<T extends MergeHead>(input: UseHeadInput<T>, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadInput<T>> | void {
  return useHead<T>(input, { ...options, mode: 'server' })
}

export function useServerHeadSafe<T extends HeadSafe>(input: T, options: HeadEntryOptions = {}): ActiveHeadEntry<T> | void {
  return useHeadSafe(input, { ...options, mode: 'server' })
}

export function useServerSeoMeta(input: UseSeoMetaInput, options?: HeadEntryOptions): ActiveHeadEntry<any> | void {
  return useSeoMeta(input, {
    ...options,
    mode: 'server',
  })
}

export { createHeadCore }
