import type { App, Plugin } from 'vue'
import { getCurrentInstance, inject, nextTick } from 'vue'
import { createHead as createUnhead, getActiveHead } from 'unhead'
import type { CreateHeadOptions, HeadPlugin, MergeHead, Unhead } from '@unhead/schema'
import type { MaybeComputedRef } from '@vueuse/shared'
import type { ReactiveHead } from './types'
import { Vue3 } from './env'
import { useHead } from './runtime/composables'
import { VueReactiveUseHeadPlugin } from '.'

export type VueHeadClient<T extends MergeHead> = Unhead<MaybeComputedRef<ReactiveHead<T>>> & Plugin

export const headSymbol = 'usehead'

export function injectHead<T extends MergeHead>() {
  return ((getCurrentInstance() && inject(headSymbol)) || getActiveHead()) as VueHeadClient<T>
}

export function createHead<T extends MergeHead>(options: Omit<CreateHeadOptions, 'domDelayFn'> = {}): VueHeadClient<T> {
  const plugins: HeadPlugin[] = [
    VueReactiveUseHeadPlugin(),
    ...(options?.plugins || []),
  ]

  const head = createUnhead<MaybeComputedRef<ReactiveHead<T>>>({
    ...options,
    // arbitrary delay the dom update for batch updates
    domDelayFn: fn => setTimeout(() => nextTick(() => fn()), 10),
    plugins,
  }) as VueHeadClient<T>

  head.install = (app: App) => {
    // vue 3 only
    if (Vue3) {
      app.config.globalProperties.$unhead = head
      app.provide(headSymbol, head)
    }
    else {
      // @ts-expect-error vue2
      app.options.$unhead = head
    }

    // options API support
    app.mixin({
      created() {
        const instance = getCurrentInstance()
        if (!instance)
          return

        // @ts-expect-error vue mismatch
        const options = Vue3 ? instance.type : instance.proxy.$options
        if (!options || !('head' in options))
          return

        const source = typeof options.head === 'function'
          ? () => options.head()
          : options.head

        useHead(source)
      },
    })
  }

  return head
}
