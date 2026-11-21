import type { LazyHeadOptions, LazyUnhead } from 'unhead/lazy'
import type { Plugin } from 'vue'
import type { UseHeadInput } from './types'
import { createHead as _createHead } from 'unhead/lazy'
import { getCurrentInstance } from 'vue'
import { vueInstall } from './install'

/** @experimental */
export type LazyVueHead = LazyUnhead<UseHeadInput> & Plugin

function entrySource() {
  const type = getCurrentInstance()?.type as { __file?: string, __name?: string, name?: string } | undefined
  return type && (type.__file || type.__name || type.name)
}

/**
 * Create a lazy head for a server-rendered Vue app. The framework calls `load()`
 * when it is ready to apply queued entries.
 *
 * @experimental
 */
/* @__NO_SIDE_EFFECTS__ */
export function createHead(options: LazyHeadOptions = {}): LazyVueHead {
  // eslint-disable-next-line node/prefer-global/process
  const head = _createHead<UseHeadInput>(process.env.NODE_ENV === 'production' ? options : { _entrySource: entrySource, ...options })
  return Object.assign(head, { install: vueInstall(head) })
}

export type { LazyHeadOptions }
