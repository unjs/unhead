import type { CreateHeadOptions, HeadEntryOptions, MergeHead } from '@unhead/schema'
import type { VueHeadClient } from './createHead'
import { createHead as _createHead } from './createHead'
import type { UseHeadInput } from './'
import { useHead } from './'

export type VueHeadClientPollyFill<T extends MergeHead> = VueHeadClient<T> & {
  /**
   * @deprecated use `resolveTags`
   */
  headTags: VueHeadClient<T>['resolveTags']
  /**
   * @deprecated use `push`
   */
  addEntry: VueHeadClient<T>['push']
  /**
   * @deprecated use `push`
   */
  addHeadObjs: VueHeadClient<T>['push']
  /**
   * @deprecated use `useHead`
   */
  addReactiveEntry: (input: UseHeadInput<T>, options?: HeadEntryOptions) => (() => void)
  /**
   * @deprecated Use useHead API.
   */
  removeHeadObjs: () => void
  /**
   * @deprecated Call hook `entries:resolve` or update an entry
   */
  updateDOM: () => void
  /**
   * @deprecated Access unhead properties directly.
   */
  unhead: VueHeadClient<T>
}

export function createHead<T extends MergeHead>(options: Omit<CreateHeadOptions, 'domDelayFn'> = {}): VueHeadClientPollyFill<T> {
  const head = _createHead(options) as VueHeadClientPollyFill<T>
  // add a bunch of @vueuse/head compat functions
  head.headTags = head.resolveTags
  head.addEntry = head.push
  head.addHeadObjs = head.push
  head.addReactiveEntry = (input, options) => {
    const api = useHead(input, options)
    if (typeof api !== 'undefined')
      return api.dispose
    return () => {}
  }
  // not able to handle this
  head.removeHeadObjs = () => {}
  // trigger DOM
  head.updateDOM = () => {
    head.hooks.callHook('entries:updated', head)
  }
  head.unhead = head
  return head
}
