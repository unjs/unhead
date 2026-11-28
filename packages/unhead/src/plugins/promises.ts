import type { HeadEntry } from '../types'
import { defineHeadPlugin } from './defineHeadPlugin'

function isThenable(v: any): v is PromiseLike<any> {
  return typeof v === 'object' && v !== null && typeof v.then === 'function'
}

// Reusable synchronous stack with an integer cursor so we never shrink
// `scratch.length` (which causes V8 to reallocate its backing array) and
// never allocate intermediate arrays on the common promise-free path.
const scratch: any[] = []
let sp = 0
let maxSp = 0

function runWithScratch<T>(fn: () => T): T {
  const base = sp
  const prevMax = maxSp
  maxSp = base
  try {
    return fn()
  }
  finally {
    const end = sp > maxSp ? sp : maxSp
    for (let i = base; i < end; i++)
      scratch[i] = undefined
    sp = base
    maxSp = prevMax
  }
}

function walkPromisesRoot(v: any): any {
  return runWithScratch(() => walkPromises(v))
}

function walkPromises(v: any): any {
  if (typeof v !== 'object' || v === null)
    return v

  if (typeof v.then === 'function')
    return Promise.resolve(v).then(walkPromisesRoot)

  if (Array.isArray(v)) {
    const start = sp
    let hasThenable = false
    for (let i = 0; i < v.length; i++) {
      const item = v[i]
      const resolved = item && typeof item === 'object' ? walkPromises(item) : item
      scratch[sp++] = resolved
      if (!hasThenable && isThenable(resolved))
        hasThenable = true
    }
    const end = sp
    if (end > maxSp)
      maxSp = end
    sp = start
    return hasThenable ? Promise.all(scratch.slice(start, end)) : v
  }

  if (v.constructor === Object) {
    const start = sp
    let hasThenable = false
    for (const key in v) {
      if (!Object.hasOwn(v, key))
        continue
      const val = v[key]
      const resolved = val && typeof val === 'object' ? walkPromises(val) : val
      scratch[sp++] = key
      scratch[sp++] = resolved
      if (!hasThenable && isThenable(resolved))
        hasThenable = true
    }
    const end = sp
    if (end > maxSp)
      maxSp = end
    sp = start
    if (!hasThenable)
      return v
    const keys: string[] = []
    const values: any[] = []
    for (let i = start; i < end; i += 2) {
      keys.push(scratch[i])
      values.push(scratch[i + 1])
    }
    return Promise.all(values).then(resolved => Object.fromEntries(
      keys.map((key, index) => [key, resolved[index]]),
    ))
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
        runWithScratch(() => {
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
        })
      },
    },
  }
}, 'promises')
