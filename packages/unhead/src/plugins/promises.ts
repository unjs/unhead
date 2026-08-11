import type { HeadEntry } from '../types'
import { defineHeadPlugin } from './defineHeadPlugin'

function isThenable(v: any): v is PromiseLike<any> {
  return typeof v?.then === 'function'
}

const maxSyncPrefix = 256

function walkArrayPromises(v: any[], index: number): any[] | undefined {
  if (index === v.length)
    return

  if (index === maxSyncPrefix) {
    // eslint-disable-next-line unicorn/no-new-array -- Bound recursion for unusually large inputs.
    const values = new Array(v.length)
    let hasThenable = false
    for (; index < v.length; index++) {
      const value = walkPromises(v[index])
      values[index] = value
      hasThenable ||= isThenable(value)
    }
    return hasThenable ? values : undefined
  }

  const value = walkPromises(v[index])
  if (isThenable(value)) {
    // eslint-disable-next-line unicorn/no-new-array -- Allocate only after the first thenable.
    const values = new Array(v.length)
    values[index] = value
    for (let rest = index + 1; rest < v.length; rest++)
      values[rest] = walkPromises(v[rest])
    return values
  }

  const values = walkArrayPromises(v, index + 1)
  if (values)
    values[index] = value
  return values
}

function walkObjectPromises(v: Record<string, any>, keys: string[], index: number): any[] | undefined {
  if (index === keys.length)
    return

  if (index === maxSyncPrefix) {
    // eslint-disable-next-line unicorn/no-new-array -- Bound recursion for unusually large inputs.
    const values = new Array(keys.length)
    let hasThenable = false
    for (; index < keys.length; index++) {
      const value = walkPromises(v[keys[index]])
      values[index] = value
      hasThenable ||= isThenable(value)
    }
    return hasThenable ? values : undefined
  }

  const value = walkPromises(v[keys[index]])
  if (isThenable(value)) {
    // eslint-disable-next-line unicorn/no-new-array -- Allocate only after the first thenable.
    const values = new Array(keys.length)
    values[index] = value
    for (let rest = index + 1; rest < keys.length; rest++)
      values[rest] = walkPromises(v[keys[rest]])
    return values
  }

  const values = walkObjectPromises(v, keys, index + 1)
  if (values)
    values[index] = value
  return values
}

function walkPromises(v: any): any {
  if (typeof v === 'function')
    return v

  if (isThenable(v))
    return Promise.resolve(v).then(walkPromises)

  if (Array.isArray(v)) {
    const values = walkArrayPromises(v, 0)
    return values ? Promise.all(values) : v
  }

  if (v?.constructor === Object) {
    const keys = Object.keys(v)
    const values = walkObjectPromises(v, keys, 0)
    if (values) {
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
