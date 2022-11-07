import type { App, InjectionKey, Plugin } from 'vue'
import { getCurrentInstance, inject, version } from 'vue'
import { HydratesStatePlugin, createHead as _createHead, getActiveHead } from 'unhead'
import type { HeadClient } from 'unhead'
import { VueReactiveInputPlugin } from './vueReactiveInputPlugin'
import type { ReactiveHead } from './types'

export const Vue3 = version.startsWith('3')

export type VueHeadClient = HeadClient<ReactiveHead>

export const headSymbol = Symbol('head') as InjectionKey<VueHeadClient>

export function injectHead() {
  return ((getCurrentInstance() && inject(headSymbol)) || getActiveHead<ReactiveHead>()) as VueHeadClient
}

export function createHead(): HeadClient<ReactiveHead> & Plugin {
  const head = _createHead<ReactiveHead>({
    plugins: [
      HydratesStatePlugin,
      VueReactiveInputPlugin,
    ],
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
