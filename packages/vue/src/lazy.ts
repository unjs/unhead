import type { DeferredHeadLifecycle, LazyHeadOptions, LazyUnhead } from 'unhead/lazy'
import type { CreateStreamableClientHeadOptions } from 'unhead/stream/client'
import type { CreateClientHeadOptions } from 'unhead/types'
import type { App, Plugin } from 'vue'
import type { UseHeadInput } from './types'
import { createDeferredHead as _createDeferredHead, createHead as _createHead, deferredHeadLifecycle } from 'unhead/lazy'
import { getCurrentInstance, unref } from 'vue'
import { installHead, vueInstall } from './install'

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

/**
 * Install a deferred head with a framework-owned hydration lifecycle.
 *
 * @experimental
 */
export function createDeferredHead(
  options: CreateClientHeadOptions,
  schedule: (app: App, lifecycle: DeferredHeadLifecycle) => void,
) {
  const [head, queue] = _createDeferredHead<UseHeadInput>(options)
  return Object.assign(head, {
    install(app: App) {
      installHead(app, head)
      schedule(app, deferredHeadLifecycle(head, queue))
    },
  })
}

/** @internal */
export function createHeadAfterHydration(options: LazyHeadOptions = {}, resolveRef?: (value: unknown) => unknown) {
  const [shell, queue] = _createDeferredHead<UseHeadInput>(options, resolveRef)
  const head = shell as typeof shell & { install: (app: App) => void }
  head.install = (app) => {
    installHead(app, head)
    const finish = () => {
      queue.hydrating = false
      requestAnimationFrame(() => head._load?.().catch(console.error))
    }
    const mount = app.mount
    app.mount = (...args) => {
      const mounted = mount.apply(app, args)
      queue.streamRoute = [app, app.config.globalProperties.$route?.path]
      const suspense = mounted?.$.subTree.suspense
      if (suspense?.pendingBranch) {
        // Flush with the root boundary's mounted effects when hydration resolves.
        suspense.effects.push(finish)
      }
      else {
        finish()
      }
      return mounted
    }
  }
  return head
}

/** @internal */
export function createStreamableHeadAfterHydration(options?: CreateStreamableClientHeadOptions) {
  const view = window as unknown as Record<string, unknown>
  if (view[options?.streamKey ?? '__unhead__']) {
    return createHeadAfterHydration(options, unref)
  }
}
