import type { CreateHeadOptions, MergeHead } from '@unhead/schema'
import type { Plugin } from 'vue'
import type { MaybeComputedRef, ReactiveHead, VueHeadClient } from './types'
import { createHead as _createHead, createServerHead as _createServerHead } from 'unhead'
import { nextTick } from 'vue'
import { Vue3 } from './env'
import VueReactivityPlugin from './plugins/VueReactivityPlugin'

export const headSymbol = 'usehead'

function vueInstall(head: VueHeadClient<any>) {
  const plugin = <Plugin> {
    install(app) {
      // vue 3 only
      if (Vue3) {
        app.config.globalProperties.$unhead = head
        // for @vueuse/head polyfill
        app.config.globalProperties.$head = head
        app.provide(headSymbol, head)
      }
    },
  }
  return plugin.install
}

export function createServerHead<T extends MergeHead>(options: Omit<CreateHeadOptions, 'domDelayFn' | 'document'> = {}): VueHeadClient<T> {
  const head = _createServerHead<MaybeComputedRef<ReactiveHead<T>>>(options) as VueHeadClient<T>
  head.use(VueReactivityPlugin)
  head.install = vueInstall(head)
  return head
}

// TODO rename to createDOMHead
export function createHead<T extends MergeHead>(options: CreateHeadOptions = {}): VueHeadClient<T> {
  options.domDelayFn = options.domDelayFn || (fn => nextTick(() => setTimeout(() => fn(), 0)))
  const head = _createHead<MaybeComputedRef<ReactiveHead<T>>>(options) as VueHeadClient<T>
  head.use(VueReactivityPlugin)
  head.install = vueInstall(head)
  return head
}
