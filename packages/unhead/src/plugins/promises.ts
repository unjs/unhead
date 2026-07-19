import type { HeadEntry } from '../types'
import { defineHeadPlugin } from './defineHeadPlugin'

function isThenable(v: any): v is PromiseLike<any> {
  return typeof v?.then === 'function'
}

function walkPromises(v: any): any {
  if (typeof v === 'function')
    return v

  if (isThenable(v))
    return Promise.resolve(v).then(walkPromises)

  if (Array.isArray(v)) {
    const values = v.map(walkPromises)
    return values.some(isThenable) ? Promise.all(values) : v
  }

  if (v?.constructor === Object) {
    const keys = Object.keys(v)
    const values = keys.map(key => walkPromises(v[key]))
    if (values.some(isThenable)) {
      return Promise.all(values).then(resolved => Object.fromEntries(
        keys.map((key, index) => [key, resolved[index]]),
      ))
    }
  }

  return v
}

/**
 * Resolves Promise values outside the synchronous tag pipeline. Pending entries
 * are omitted from the current render and become available on the next render.
 */
export const PromisesPlugin = /* @__PURE__ */ defineHeadPlugin((head) => {
  const pending = new WeakMap<HeadEntry<any>, unknown>()

  return {
    key: 'promises',
    hooks: {
      'entries:resolve': (ctx) => {
        for (let index = ctx.entries.length - 1; index >= 0; index--) {
          const entry = ctx.entries[index]
          const input = entry.input
          if (pending.get(entry) === input) {
            ctx.entries.splice(index, 1)
            continue
          }

          const result = walkPromises(input)
          if (!isThenable(result)) {
            pending.delete(entry)
            continue
          }

          pending.set(entry, input)
          ctx.entries.splice(index, 1)
          void Promise.resolve(result).then(
            (resolved) => {
              if (pending.get(entry) !== input)
                return
              pending.delete(entry)
              entry.input = resolved
              delete entry._tags
              head.invalidate?.()
            },
            () => {
              if (pending.get(entry) === input)
                pending.delete(entry)
            },
          )
        }
      },
    },
  }
}, 'promises')
