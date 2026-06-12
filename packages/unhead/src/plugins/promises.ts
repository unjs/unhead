import { defineHeadPlugin } from './defineHeadPlugin'

async function walkPromises(v: any): Promise<any> {
  const type = typeof v
  if (type === 'function') {
    return v
  }
  // Combined primitive type check
  if (v instanceof Promise) {
    return await v
  }

  if (Array.isArray(v)) {
    return await Promise.all(v.map(r => walkPromises(r)))
  }

  if (v?.constructor === Object) {
    const next: Record<string, any> = {}
    for (const key of Object.keys(v)) {
      next[key] = await walkPromises(v[key])
    }
    return next
  }

  return v
}

export const PromisesPlugin = /* @__PURE__ */ defineHeadPlugin({
  key: 'promises',
  hooks: {
    'entries:resolve': async (ctx) => {
      const promises = []
      for (const k in ctx.entries) {
        if (!ctx.entries[k]._promisesProcessed) {
          promises.push(
            walkPromises(ctx.entries[k].input).then((val) => {
              ctx.entries[k].input = val
              ctx.entries[k]._promisesProcessed = true
            }),
          )
        }
      }
      await Promise.all(promises)
    },
  },
})
