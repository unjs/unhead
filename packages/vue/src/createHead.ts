import type { Plugin } from 'vue'
import { getCurrentInstance, inject, nextTick } from 'vue'
import { createHead as _createHead, createServerHead as _createServerHead, getActiveHead } from 'unhead'
import type { CreateHeadOptions, MergeHead, Unhead } from '@unhead/schema'
import type { MaybeComputedRef, ReactiveHead } from './types'
import { Vue3 } from './env'
import { VueReactiveUseHeadPlugin } from '.'

export type VueHeadClient<T extends MergeHead> = Unhead<MaybeComputedRef<ReactiveHead<T>>> & Plugin

export const headSymbol = 'usehead'

export function injectHead<T extends MergeHead>() {
  return ((getCurrentInstance() && inject(headSymbol)) || getActiveHead()) as VueHeadClient<T>
}

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
  const head = _createServerHead<MaybeComputedRef<ReactiveHead<T>>>({
    ...options,
    plugins: [
      VueReactiveUseHeadPlugin(),
      ...(options?.plugins || []),
    ],
  }) as VueHeadClient<T>

  head.install = vueInstall(head)
  return head
}

export function createHead<T extends MergeHead>(options: Omit<CreateHeadOptions, 'domDelayFn'> = {}): VueHeadClient<T> {
  const head = _createHead<MaybeComputedRef<ReactiveHead<T>>>({
    ...options,
    // arbitrary delay the dom update for batch updates
    domDelayFn: fn => setTimeout(() => nextTick(() => fn()), 10),
    plugins: [
      VueReactiveUseHeadPlugin(),
      ...(options?.plugins || []),
    ],
  }) as VueHeadClient<T>
  head.install = vueInstall(head)
  return head
}
