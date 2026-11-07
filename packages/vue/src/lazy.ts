import type { CreateLazyHeadOptions, LazyUnhead } from 'unhead/lazy'
import type { UseHeadInput, VueHeadClient } from './types'
import { createLazyHead as _createLazyHead } from 'unhead/lazy'
import { vueInstall } from './install'

export type VueLazyHead = LazyUnhead<UseHeadInput> & VueHeadClient<UseHeadInput, boolean>

/**
 * Creates a head for a server rendered Vue app that loads its DOM runtime lazily.
 *
 * @experimental The lazy head API may change in a future minor release.
 */
/* @__NO_SIDE_EFFECTS__ */
export function createLazyHead(options: CreateLazyHeadOptions = {}): VueLazyHead {
  const head = _createLazyHead<UseHeadInput>(options) as VueLazyHead
  head.install = vueInstall(head)
  return head
}

export type {
  CreateLazyHeadOptions,
}
