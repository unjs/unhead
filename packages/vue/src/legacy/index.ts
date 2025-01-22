import type { ActiveHeadEntry, CreateClientHeadOptions, HeadEntryOptions, MergeHead } from '@unhead/schema'
import type {
  Ref,
} from 'vue'
import type {
  UseHeadInput,
  UseHeadOptions,
  UseHeadSafeInput,
  UseSeoMetaInput,
  VueHeadClient,
} from '../types'
import { defineHeadPlugin, unpackMeta, whitelistSafeInput } from '@unhead/shared'
import { createHeadCore } from 'unhead'
import { DeprecationsPlugin, PromisesPlugin } from 'unhead/plugins'
import {
  getCurrentInstance,
  inject,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  ref,
  watch,
  watchEffect,
} from 'vue'
import { createHead as createVueHead } from '../client'
import { headSymbol } from '../install'
import { createHead as createVueServerHead } from '../server'
import { resolveUnrefHeadInput } from '../utils'

export * from './useScript'
export { createHeadCore, resolveUnrefHeadInput }

export const CapoPlugin = () => defineHeadPlugin({})

export function createHead<T extends MergeHead>(options: CreateClientHeadOptions = {}): VueHeadClient<T> {
  return createVueHead({
    disableCapoSorting: true,
    ...options,
    plugins: [
      DeprecationsPlugin,
      PromisesPlugin,
      ...(options.plugins || []),
    ],
  }) as VueHeadClient<T>
}

export function createServerHead<T extends MergeHead>(options: CreateClientHeadOptions = {}): VueHeadClient<T> {
  return createVueServerHead({
    disableCapoSorting: true,
    ...options,
    plugins: [
      DeprecationsPlugin,
      PromisesPlugin,
      ...(options.plugins || []),
    ],
  })
}

/**
 * @deprecated Please switch to non-legacy version
 */
// eslint-disable-next-line unused-imports/no-unused-vars
export function setHeadInjectionHandler(handler: () => VueHeadClient<any> | undefined) {
  // noop
}

export function injectHead() {
  // fallback to vue context
  return inject<VueHeadClient<any>>(headSymbol)
}

export function useHead<T extends MergeHead>(input: UseHeadInput<T>, options: UseHeadOptions = {}): ActiveHeadEntry<UseHeadInput<T>> | void {
  const head = options.head || injectHead()
  if (head) {
    return head.ssr ? head.push(input, options as HeadEntryOptions) : clientUseHead(head, input, options as HeadEntryOptions)
  }
}

function clientUseHead<T extends MergeHead>(head: VueHeadClient<T>, input: UseHeadInput<T>, options: HeadEntryOptions = {}): ActiveHeadEntry<UseHeadInput<T>> | void {
  const deactivated = ref(false)

  const resolvedInput: Ref<UseHeadInput<T>> = ref({})
  watchEffect(() => {
    resolvedInput.value = deactivated.value
      ? {}
      : resolveUnrefHeadInput(input)
  })
  const entry: ActiveHeadEntry<UseHeadInput<T>> = head.push(resolvedInput.value, options)
  watch(resolvedInput, (e) => {
    entry.patch(e)
  })

  const vm = getCurrentInstance()
  if (vm) {
    onBeforeUnmount(() => {
      entry.dispose()
    })
    onDeactivated(() => {
      deactivated.value = true
    })
    onActivated(() => {
      deactivated.value = false
    })
  }
  return entry
}

export function useHeadSafe(input: UseHeadSafeInput, options: UseHeadOptions = {}): ActiveHeadEntry<UseHeadSafeInput> | void {
  // @ts-expect-error untyped
  return useHead(input, { ...options, transform: whitelistSafeInput })
}

export function useSeoMeta(input: UseSeoMetaInput, options?: UseHeadOptions): ActiveHeadEntry<any> | void {
  const { title, titleTemplate, ...meta } = input
  return useHead({
    title,
    titleTemplate,
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

export function useServerHead<T extends MergeHead>(input: UseHeadInput<T>, options: UseHeadOptions = {}): ActiveHeadEntry<any> | void {
  return useHead(input, { ...options, mode: 'server' })
}

export function useServerHeadSafe(input: UseHeadSafeInput, options: UseHeadOptions = {}): ActiveHeadEntry<any> | void {
  return useHeadSafe(input, { ...options, mode: 'server' })
}

export function useServerSeoMeta(input: UseSeoMetaInput, options?: UseHeadOptions): ActiveHeadEntry<any> | void {
  return useSeoMeta(input, { ...options, mode: 'server' })
}
