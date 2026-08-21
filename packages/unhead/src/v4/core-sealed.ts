/**
 * Plugin-free core for the strict compiled profiles: sealed PlanTag arrays
 * in, resolved tags out. No plugin slots, no ResolveCtx, no loose compile.
 * Kept out of `./core` (and so out of the `unhead/v4` barrel) on purpose:
 * this is an implementation detail of client-compiled/server-compiled, not
 * a public building block like `createCore`.
 *
 * The dedupe/arrayable loop is a twin of createCore's resolve (kept
 * duplicated on purpose: no bundle ever contains both cores, so sharing
 * would only add indirection bytes to each profile).
 */
import type { Entry, PlanFill, PlanTag, Tag, V4Head } from './core'
import { F_ARRAYABLE, revivePlan } from './core'

const sortTags = (a: Tag, b: Tag) => a.w - b.w || a.o - b.o

export function createSealedCore(options: { ssr: boolean }): V4Head {
  const entries = new Map<number, Entry>()
  let cAll: Tag[] | null = null
  const head = {
    entries,
    ssr: options.ssr,
    _c: 1,
    use() {
      throw new Error('[unhead] compiled heads cannot install runtime plugins')
    },
    invalidate() {
      cAll = null
    },
    push(input: unknown, opts?: { fills?: readonly PlanFill[] }) {
      // no upfront shape check: a loose object is accepted here (matching
      // createCore's push) and only fails once resolve() tries to compile it
      const i = head._c++
      const entry: Entry = { i, input, fills: opts?.fills || null, tags: null, opts: opts as Entry['opts'] || null }
      entries.set(i, entry)
      cAll = null
      return {
        patch(next: unknown, nextFills?: readonly PlanFill[]) {
          entry.input = next
          nextFills && (entry.fills = nextFills)
          entry.tags = null
          cAll = null
        },
        dispose() {
          entries.delete(i)
          cAll = null
        },
      }
    },
    resolve() {
      let all = cAll
      if (!all) {
        let n = 0
        for (const e of entries.values()) {
          if (!e.tags) {
            if (!Array.isArray(e.input))
              throw new Error('[unhead] strict core cannot compile loose input')
            e.tags = revivePlan(e.input as PlanTag[], e.fills, e.i)
          }
          n += e.tags.length
        }
        // eslint-disable-next-line unicorn/no-new-array -- hot path, measured 2.4x over push (V4_DESIGN.md s3)
        all = cAll = new Array(n)
        let w = 0
        for (const e of entries.values()) {
          const tags = e.tags!
          for (let i = 0; i < tags.length; i++) all[w++] = tags[i]
        }
        all.sort(sortTags)
      }
      const n = all.length
      const byKey: Record<string, number> = Object.create(null)
      const slots: (Tag | Tag[])[] = []
      let hasArrayAppend = false
      for (let i = 0; i < n; i++) {
        const t = all[i]
        const d = t.d
        if (!d) {
          slots.push(t)
          continue
        }
        const idx = byKey[d]
        if (idx === undefined) {
          byKey[d] = slots.length
          slots.push(t)
          continue
        }
        const cur = slots[idx]
        const prev = Array.isArray(cur) ? cur[cur.length - 1] : cur
        if (t.f & F_ARRAYABLE && t.o >> 12 === prev.o >> 12) {
          Array.isArray(cur) ? cur.push(t) : slots[idx] = [cur, t]
          hasArrayAppend = true
        }
        else if (t.w === prev.w) {
          slots[idx] = t
        }
      }
      if (!hasArrayAppend)
        return slots as Tag[]
      const out = slots.flat()
      out.sort(sortTags)
      return out
    },
  }
  return head as unknown as V4Head
}
