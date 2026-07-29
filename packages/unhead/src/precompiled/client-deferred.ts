import type { ResolvableHead, UseSeoMetaInput } from 'unhead/types'
import type { PrecompiledClientEntry, PrecompiledClientHead, PrecompiledClientInput } from './client'

interface DeferredRecord {
  active: boolean
  disposed?: boolean
  input: PrecompiledClientInput
  runtimeId?: number
}

export interface DeferredPrecompiledClientEntry extends PrecompiledClientEntry {
  /** @internal */
  _setActive: (active: boolean) => void
}

export interface DeferredPrecompiledClientHead {
  /** Resolves after the full client runtime has loaded and active plans have replayed. */
  ready: Promise<void>
  push: (input: PrecompiledClientInput) => DeferredPrecompiledClientEntry
  render: () => boolean
}

/**
 * Create an SSR-first client head that loads its DOM runtime asynchronously.
 *
 * The server-rendered head remains authoritative while static plans queue.
 * Disposed plans are removed from the queue and are never replayed.
 *
 * @experimental
 */
export function createHead(): DeferredPrecompiledClientHead {
  let pending: DeferredRecord[] | undefined = []
  let runtime: PrecompiledClientHead | undefined
  const pushRuntimeMany = (batch: DeferredRecord[]) => {
    const runtimePush = runtime!.push as (input: PrecompiledClientInput, batch?: 0) => PrecompiledClientEntry
    for (let i = 0; i < batch.length; i++) {
      const record = batch[i]
      runtimePush(!record.disposed && record.active ? record.input : [], i === batch.length - 1 ? undefined : 0)
      record.runtimeId = runtime!._c
    }
    const active = runtime!._s?.tags
    for (const record of batch) {
      if (!record.disposed && record.active)
        continue
      if (record.disposed)
        runtime!._e.delete(record.runtimeId!)
      for (const tag of record.input) {
        if (active?.has(tag[1]) || tag[2] === 'title')
          continue
        if (tag[2].endsWith('Attrs')) {
          const document = globalThis.document
          if (!document)
            continue
          const el = tag[2] === 'htmlAttrs' ? document.documentElement : document.body
          for (const prop in tag[3])
            el.removeAttribute(prop)
        }
        else {
          const adopted = runtime!._s?.adopted
          const key = tag[7] || tag[1]
          const value = adopted?.get(key)
          value?.shift()?.remove()
          if (value?.length === 0)
            adopted?.delete(key)
        }
      }
    }
  }

  const entry = (record: DeferredRecord): DeferredPrecompiledClientEntry => ({
    _setActive(active) {
      if (!record.disposed && record.active !== active) {
        record.active = active
        if (runtime && record.runtimeId !== undefined) {
          runtime._e.set(record.runtimeId, active ? record.input : [])
          runtime.render()
        }
      }
    },
    dispose() {
      if (!record.disposed) {
        record.disposed = true
        if (runtime && record.runtimeId !== undefined && runtime._e.delete(record.runtimeId))
          runtime.render()
      }
    },
  })

  const head: DeferredPrecompiledClientHead = {
    ready: import('./client').then((module) => {
      runtime = module.createHead()
      pushRuntimeMany(pending!)
      pending = undefined
    }),
    push(input) {
      const record: DeferredRecord = { active: true, input }
      pending?.push(record)
      if (runtime) {
        runtime.push(input)
        record.runtimeId = runtime._c
      }
      return entry(record)
    },
    render: () => runtime?.render() || false,
  }
  return head
}

/** Add one queued build-finalized client entry. @experimental */
export function useHead(input: ResolvableHead, options: { head: DeferredPrecompiledClientHead }): PrecompiledClientEntry {
  return options.head.push(input as unknown as PrecompiledClientInput)
}

/** Add one queued build-finalized static SEO entry. @experimental */
export const useSeoMeta = useHead as (input: UseSeoMetaInput, options: { head: DeferredPrecompiledClientHead }) => PrecompiledClientEntry

/** Render through the loaded client runtime, if it is ready. @experimental */
export function renderDOMHead(head: DeferredPrecompiledClientHead): boolean {
  return head.render()
}
