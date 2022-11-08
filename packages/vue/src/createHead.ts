import type { App, Plugin } from 'vue'
import { getCurrentInstance, inject } from 'vue'
import { HydratesStatePlugin, createHead as _createHead, getActiveHead } from 'unhead'
import type { CreateHeadOptions, HeadClient, HeadPlugin, MergeHead } from '@unhead/schema'
import type { MaybeComputedRef } from '@vueuse/shared'
import { VueReactiveInputPlugin } from './plugin'
import type { ReactiveHead, UseHeadInput } from './types'
import { IsBrowser, Vue3 } from './env'
import { useHead } from './runtime'

export type VueHeadClient<T extends MergeHead> = HeadClient<MaybeComputedRef<ReactiveHead<T>>> & Plugin

export const headSymbol = Symbol('unhead')

export function injectHead<T extends MergeHead>() {
  return ((getCurrentInstance() && inject(headSymbol)) || getActiveHead()) as VueHeadClient<T>
}

export async function createHead<T extends MergeHead>(options: CreateHeadOptions = {}): Promise<VueHeadClient<T>> {
  const plugins: HeadPlugin[] = [
    HydratesStatePlugin(),
    VueReactiveInputPlugin(),
    ...(options?.plugins || []),
  ]

  if (IsBrowser) {
    const { VueTriggerDomPatchingOnUpdatesPlugin } = await import('./plugin/vueTriggerDomPatchingOnUpdatesPlugin')
    plugins.push(VueTriggerDomPatchingOnUpdatesPlugin())
  }

  const head = await _createHead<UseHeadInput>({
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
        // @todo load this in dynamically as useHead can be a runtime function
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
