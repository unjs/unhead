import type { ActiveHeadEntry, CreateClientHeadOptions, HeadEntryOptions } from 'unhead/types'
import type { UseHeadInput, VueHeadClient } from './types'
import { createHead as _createHead, createDebouncedFn, renderDOMHead } from 'unhead/client'
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
  push: VueHeadClient<UseHeadInput>['push'],
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
    _poll: rm => activeEntry()._poll(rm),
    patch,
    dispose() {
      stopWatcher?.()
      stopWatcher = undefined
      activeEntry().dispose()
    },
  }
}

/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: CreateClientHeadOptions = {}): VueHeadClient {
  const head = _createHead({
    domOptions: {
      render: createDebouncedFn(() => renderDOMHead(head), fn => setTimeout(fn, 0)),
    },
    ...options,
  }) as VueHeadClient
  const push = head.push
  head.push = (input, entryOptions) => createReactiveHeadEntry(push, input, entryOptions)
  head.install = vueInstall(head)
  return head
}

export type {
  CreateClientHeadOptions,
  VueHeadClient,
}
