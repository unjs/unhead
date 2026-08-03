/**
 * v4 L0 core: strict head. Tags/plans in, resolved tags out.
 * See packages/unhead/V4_DESIGN.md sections 2-4.
 */

// tag type ids; TAG_NAMES[id] is the only string source, used at render boundaries
export const TAG_NAMES = ['title', 'base', 'meta', 'link', 'style', 'script', 'noscript', 'htmlAttrs', 'bodyAttrs', 'titleTemplate'] as const

export const T_TITLE = 0
export const T_BASE = 1
export const T_META = 2
export const T_LINK = 3
export const T_STYLE = 4
export const T_SCRIPT = 5
export const T_NOSCRIPT = 6
export const T_HTML_ATTRS = 7
export const T_BODY_ATTRS = 8
export const T_TITLE_TEMPLATE = 9

// bitmask classes: test with MASK >> id & 1
export const SELF_CLOSING = 1 << T_BASE | 1 << T_META | 1 << T_LINK
export const INNER_CONTENT = 1 << T_TITLE | 1 << T_STYLE | 1 << T_SCRIPT | 1 << T_NOSCRIPT | 1 << T_TITLE_TEMPLATE

// f layout: bits 0-3 type id | 4-5 position (0 head, 1 bodyOpen, 2 bodyClose) | flags
export const F_ID = 15
export const POS_SHIFT = 4
export const F_POS = 3 << POS_SHIFT
export const F_RAW = 1 << 6 // c is innerHTML (pre-escaped at compile)
export const F_ARRAYABLE = 1 << 7 // meta identity appends within an entry instead of replacing
export const F_PREBUILT = 1 << 8 // c is final html (server plan tag)
export const F_REMOVED = 1 << 9 // resolve-slot tombstone; renderers skip

export interface Tag {
  f: number
  w: number
  o: number // entrySeq * 4096 + tagIndex
  d: string // identity; '' = positionally unique
  p: Record<string, any> | null
  c: string | null
}

export interface Entry {
  i: number
  input: unknown
  fills: unknown[] | null
  tags: Tag[] | null
  opts: EntryOptions | null
}

export interface EntryOptions {
  tagPriority?: number | string
  tagPosition?: 'head' | 'bodyOpen' | 'bodyClose'
  fills?: unknown[]
}

export interface ResolveCtx {
  tags: (Tag | Tag[])[]
  get: (d: string) => Tag | undefined
  /**
   * Copy-on-write mutation. Entry tag caches are shared across renders; plugins
   * must never mutate a resolved tag directly. patch() clones the tag with the
   * changes applied, swaps it into the resolved set, and returns the clone.
   */
  patch: (tag: Tag, changes: Partial<Tag>) => Tag
  head: V4Head
}

export interface V4Plugin {
  key: string
  init?: (head: V4Head) => void
  resolve?: (ctx: ResolveCtx) => void
}

export type Compile = (input: any, seq: number, opts: EntryOptions | null) => Tag[]

// server plan tag: [w, d, html, pos?] | [w, d, segments, modes, pos?]
export type PlanTag = [number, string, string | string[], number?, number?]

export interface V4Head {
  entries: Map<number, Entry>
  ssr: boolean
  _c: number
  _pk: Record<string, 1>
  _pr: NonNullable<V4Plugin['resolve']>[]
  _compile: Compile
  use: (p: V4Plugin) => void
  push: (input: unknown, opts?: EntryOptions) => { patch: (input: unknown, fills?: unknown[]) => void, dispose: () => void }
  resolve: () => Tag[]
}

const ESC_AMP_RE = /&/g
const ESC_LT_RE = /</g
const ESC_QUOT_RE = /"/g

// hole escape modes: 0 text, 1 attr, 2 json. `at` is the entry-level fill
// cursor: fills are shared across a plan's tuples, consumed left to right.
function fillHoles(segments: string[], modes: number, fills: readonly unknown[], at: number): string {
  let out = segments[0]
  for (let i = 0; i < segments.length - 1; i++) {
    const v = String(fills[at + i] ?? '')
    const mode = modes >> (i * 2) & 3
    out += (mode === 1
      ? (v.includes('"') ? v.replace(ESC_QUOT_RE, '&quot;') : v)
      : mode === 2
        ? v.replace(ESC_LT_RE, '\\u003C')
        : v.replace(ESC_AMP_RE, '&amp;').replace(ESC_LT_RE, '&lt;')) + segments[i + 1]
  }
  return out
}

export function revivePlan(plan: PlanTag[], fills: readonly unknown[] | null, seq: number): Tag[] {
  const o = seq * 4096
  const tags: Tag[] = Array.from({ length: plan.length })
  let fillAt = 0
  for (let i = 0; i < plan.length; i++) {
    const t = plan[i]
    const seg = t[2]
    const isHole = typeof seg !== 'string'
    const pos = (isHole ? t[4] : t[3]) || 0
    // pos 3/4 target html/body attrs; 0-2 are document buckets
    const f = F_PREBUILT
      | (pos === 3 ? T_HTML_ATTRS : pos === 4 ? T_BODY_ATTRS : pos << POS_SHIFT)
    let c: string
    if (isHole) {
      c = fillHoles(seg, t[3] || 0, fills || [], fillAt)
      fillAt += seg.length - 1
    }
    else {
      c = seg
    }
    tags[i] = { f, w: t[0], o: o + i, d: t[1], p: null, c }
  }
  return tags
}

const sortTags = (a: Tag, b: Tag) => a.w - b.w || a.o - b.o

export function createCore(options: { ssr: boolean, compile?: Compile }): V4Head {
  const entries = new Map<number, Entry>()
  const head: V4Head = {
    entries,
    ssr: options.ssr,
    _c: 1,
    _pk: Object.create(null),
    _pr: [],
    _compile: options.compile || (() => {
      throw new Error('[unhead] strict core cannot compile loose input')
    }),
    use(p) {
      if (head._pk[p.key])
        return
      head._pk[p.key] = 1
      if (p.resolve)
        head._pr.push(p.resolve)
      p.init?.(head)
    },
    push(input, opts) {
      const i = head._c++
      const fills = opts?.fills || null
      const entry: Entry = {
        i,
        input,
        fills,
        tags: Array.isArray(input) ? revivePlan(input as PlanTag[], fills, i) : null,
        opts: opts || null,
      }
      entries.set(i, entry)
      return {
        patch(next, nextFills) {
          entry.input = next
          entry.tags = Array.isArray(next) ? revivePlan(next as PlanTag[], nextFills || entry.fills, i) : null
        },
        dispose() {
          entries.delete(i)
        },
      }
    },
    resolve() {
      let n = 0
      for (const e of entries.values()) {
        n += (e.tags || (e.tags = head._compile(e.input, e.i, e.opts))).length
      }
      const all: Tag[] = Array.from({ length: n })
      let w = 0
      for (const e of entries.values()) {
        const tags = e.tags!
        for (let i = 0; i < tags.length; i++) all[w++] = tags[i]
      }
      all.sort(sortTags)

      // dedupe: byKey maps d -> slot index; slots hold a Tag or a Tag[] (arrayable append)
      const byKey: Record<string, number> = Object.create(null)
      const slots: (Tag | Tag[])[] = []
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
        // arrayable identities append within the same entry; across entries the
        // later entry replaces the whole set (v3 semantics)
        if (t.f & F_ARRAYABLE && (t.o / 4096 | 0) === (prev.o / 4096 | 0)) {
          Array.isArray(cur) ? cur.push(t) : slots[idx] = [cur, t]
        }
        else if (t.w === prev.w) {
          // sorted ascending: equal weight means higher o, later wins
          slots[idx] = t
        }
        // lower-w existing wins; nothing to do
      }

      if (head._pr.length) {
        const ctx: ResolveCtx = {
          tags: slots,
          get: (d) => {
            const idx = byKey[d]
            if (idx === undefined)
              return undefined
            const s = slots[idx]
            return Array.isArray(s) ? s[0] : s
          },
          patch: (tag, changes) => {
            const next = { ...tag, ...changes }
            const idx = byKey[tag.d]
            if (idx !== undefined) {
              // slot containers are per-resolve, safe to write; only the
              // entry-cached Tag objects themselves are shared
              const s = slots[idx]
              if (Array.isArray(s)) {
                const j = s.indexOf(tag)
                if (j >= 0)
                  s[j] = next
              }
              else if (s === tag) {
                slots[idx] = next
              }
            }
            return next
          },
          head,
        }
        for (let i = 0; i < head._pr.length; i++) head._pr[i](ctx)
      }

      // flatten; removed tags are skipped at render, kept here to preserve indices
      const out: Tag[] = []
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i]
        if (Array.isArray(s)) {
          for (let j = 0; j < s.length; j++) out.push(s[j])
        }
        else {
          out.push(s)
        }
      }
      return out
    },
  }
  return head
}
