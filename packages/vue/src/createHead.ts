import type { App, InjectionKey, Plugin } from 'vue'
import { getCurrentInstance, inject } from 'vue'
import { HydratesStatePlugin, createHead as _createHead, getActiveHead } from 'unhead'
import type { CreateHeadOptions, HeadClient, HeadPlugin } from '@unhead/schema'
import { VueReactiveInputPlugin } from './plugin/vueReactiveInputPlugin'
import type { UseHeadInput } from './types'
import { IsClient, Vue3 } from './env'

export type VueHeadClient = HeadClient<UseHeadInput> & Plugin

export const headSymbol = Symbol('head') as InjectionKey<VueHeadClient>

export function injectHead() {
  return ((getCurrentInstance() && inject(headSymbol)) || getActiveHead()) as VueHeadClient
}

export async function createHead(options: CreateHeadOptions = {}): Promise<VueHeadClient> {
  const plugins: HeadPlugin[] = [
    HydratesStatePlugin(),
    VueReactiveInputPlugin(),
    ...(options?.plugins || []),
  ]

  if (IsClient) {
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

          head.push(source)
        },
      })
    },
  }

  return { ...vuePlugin, ...head }
}
