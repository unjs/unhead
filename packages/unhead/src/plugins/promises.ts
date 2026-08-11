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
    for (let index = 0; index < v.length; index++) {
      const value = walkPromises(v[index])
      if (isThenable(value)) {
        // eslint-disable-next-line unicorn/no-new-array -- Allocate only after the first thenable.
        const values = new Array(v.length)
        for (let prefix = 0; prefix < index; prefix++)
          values[prefix] = v[prefix]
        values[index] = value
        for (let rest = index + 1; rest < v.length; rest++)
          values[rest] = walkPromises(v[rest])
        return Promise.all(values)
      }
    }
    return v
  }

  if (v?.constructor === Object) {
    const keys = Object.keys(v)
    for (let index = 0; index < keys.length; index++) {
      const value = walkPromises(v[keys[index]])
      if (isThenable(value)) {
        // eslint-disable-next-line unicorn/no-new-array -- Allocate only after the first thenable.
        const values = new Array(keys.length)
        for (let prefix = 0; prefix < index; prefix++)
          values[prefix] = v[keys[prefix]]
        values[index] = value
        for (let rest = index + 1; rest < keys.length; rest++)
          values[rest] = walkPromises(v[keys[rest]])
        return Promise.all(values).then((resolved) => {
          const output: Record<string, any> = {}
          for (let resolvedIndex = 0; resolvedIndex < keys.length; resolvedIndex++)
            output[keys[resolvedIndex]] = resolved[resolvedIndex]
          return output
        })
      }
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
