import { defineHeadPlugin } from '../utils'

async function resolvePromisesRecursively(root: any): Promise<any> {
  if (root instanceof Promise) {
    return await root
  }
  // could be a root primitive, array or object
  if (Array.isArray(root)) {
    return Promise.all(root.map(r => resolvePromisesRecursively(r)))
  }
  if (typeof root === 'object') {
    const resolved: Record<string, string> = {}

    for (const k in root) {
      if (!Object.prototype.hasOwnProperty.call(root, k)) {
        continue
      }

      resolved[k] = await resolvePromisesRecursively(root[k])
    }

    return resolved
  }
  return root
}

export const PromisesPlugin = defineHeadPlugin({
  hooks: {
    'entries:resolve': async (ctx) => {
      for (const k in ctx.entries) {
        ctx.entries[k].input = await resolvePromisesRecursively(ctx.entries[k].input)
      }
    },
  },
})
