import type { ActiveHeadEntry, CreateClientHeadOptions, HeadEntryOptions } from 'unhead/types'
import type { UseHeadInput, VueHeadClient } from './types'
import { createHead as _createHead, createDomRenderer } from 'unhead/client'
import { walkResolver } from 'unhead/utils'
import { isRef, watchEffect } from 'vue'
import { vueInstall } from './install'
import { VueResolver } from './resolver'

export { VueHeadMixin } from './VueHeadMixin'
export { renderDOMHead } from 'unhead/client'

function isReactiveHeadInput(input: UseHeadInput) {
  return typeof input === 'function' || isRef(input)
}

type ReactiveEntryState
  = | { _tag: 'uninitialized' }
    | { _tag: 'active', entry: ActiveHeadEntry<UseHeadInput> }

function createReactiveHeadEntry(
  push: VueHeadClient<UseHeadInput, boolean>['push'],
  input: UseHeadInput,
  options?: HeadEntryOptions,
): ActiveHeadEntry<UseHeadInput> {
  let state: ReactiveEntryState = { _tag: 'uninitialized' }
  let stopWatcher: (() => void) | undefined

  const activeEntry = () => {
    if (state._tag === 'uninitialized')
      throw new Error('Vue head entry was not initialized synchronously.')
    return state.entry
  }

  const patch = (nextInput: UseHeadInput) => {
    stopWatcher?.()
    stopWatcher = undefined

    if (isReactiveHeadInput(nextInput)) {
      stopWatcher = watchEffect(() => {
        const resolved = walkResolver(nextInput, VueResolver)
        if (state._tag === 'active')
          state.entry.patch(resolved)
        else
          state = { _tag: 'active', entry: push(resolved, options) }
      })
    }
    else if (state._tag === 'active') {
      state.entry.patch(nextInput)
    }
    else {
      state = { _tag: 'active', entry: push(nextInput, options) }
    }
  }

  patch(input)

  return {
    _i: activeEntry()._i,
    patch,
    dispose() {
      stopWatcher?.()
      stopWatcher = undefined
      activeEntry().dispose()
    },
  }
}

/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: CreateClientHeadOptions = {}): VueHeadClient<UseHeadInput, boolean> {
  const domRenderer = createDomRenderer()
  let head: VueHeadClient<UseHeadInput, boolean>
  let renderId = 0
  const debouncedRenderer = () => {
    const id = ++renderId
    setTimeout(() => {
      if (id === renderId)
        domRenderer(head)
    }, 0)
  }
  head = _createHead({ render: debouncedRenderer, ...options }) as VueHeadClient<UseHeadInput, boolean>
  const push = head.push
  head.push = (input, entryOptions) => createReactiveHeadEntry(push, input, entryOptions)
  head.install = vueInstall(head)
  return head
}

export type {
  CreateClientHeadOptions,
  VueHeadClient,
}
