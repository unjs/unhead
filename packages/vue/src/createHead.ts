import type { App, Plugin } from 'vue'
import { getCurrentInstance, inject } from 'vue'
import { HydratesStatePlugin, createHead as createUnhead, getActiveHead } from 'unhead'
import type { CreateHeadOptions, HeadClient, HeadPlugin, MergeHead } from '@unhead/schema'
import type { MaybeComputedRef } from '@vueuse/shared'
import { VueReactiveInputPlugin } from './plugin'
import type { ReactiveHead } from './types'
import { Vue3 } from './env'
import { useHead } from './runtime/composables'

export type VueHeadClient<T extends MergeHead> = HeadClient<MaybeComputedRef<ReactiveHead<T>>> & Plugin

export const headSymbol = 'usehead'

export function injectHead<T extends MergeHead>() {
  return ((getCurrentInstance() && inject(headSymbol)) || getActiveHead()) as VueHeadClient<T>
}

export function createHead<T extends MergeHead>(options: CreateHeadOptions = {}): VueHeadClient<T> {
  const plugins: HeadPlugin[] = [
    HydratesStatePlugin(),
    VueReactiveInputPlugin(),
    ...(options?.plugins || []),
  ]

  const head = createUnhead<MaybeComputedRef<ReactiveHead<T>>>({
    ...options,
    plugins,
  })

  const vuePlugin: Plugin = {
    install(app: App) {
      // vue 3 only
      if (Vue3)
        app.config.globalProperties.$head = head

      app.provide(headSymbol, head)

      // mixin support
      app.mixin({
        created() {
          const instance = getCurrentInstance()
          if (!instance)
            return

          const options = instance.type
          if (!options || !('head' in options))
            return

          const source = typeof options.head === 'function'
            ? () => options.head()
            : options.head

          useHead(source)
        },
      })
    },
  }

  return { ...vuePlugin, ...head }
}
