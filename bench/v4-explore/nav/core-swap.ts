/**
 * BENCH-ONLY VARIANT of packages/unhead/src/v4/core.ts: adds head.swap(),
 * the group-replace primitive from V4_DESIGN.md section 11. Everything else
 * is byte-identical to the shipped core so an esbuild+gzip diff of the two
 * files measures the primitive's true wire cost.
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
  /** cross-plugin state, fresh per resolve (replaces v3 back-channels) */
  shared: Record<string, unknown>
  get: (d: string) => Tag | undefined
  /** flat iteration over the resolved set; arrayable slots are unrolled */
  each: (fn: (tag: Tag) => void) => void
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
  /** raw input, pre-compile; runs at push and entry.patch */
  entry?: (entry: Entry, head: V4Head) => void
  /** per-entry post-compile transform; result cached with the entry */
  tags?: (tags: Tag[], entry: Entry, head: V4Head) => Tag[] | void
  resolve?: (ctx: ResolveCtx) => void
}

export type Compile = (input: any, seq: number, opts: EntryOptions | null) => Tag[]

// server plan tag: [w, d, html, pf?] | [w, d, segments, modes, pf?]
// pf bits 0-2: position (0 head, 1 bodyOpen, 2 bodyClose, 3 htmlAttrs, 4 bodyAttrs);
// bit 3: arrayable (revives with F_ARRAYABLE). Attr fragments are single-attr strings.
export type PlanTag = [number, string, string | string[], number?, number?]

export interface V4Head {
  entries: Map<number, Entry>
  ssr: boolean
  _c: number
  _pk: Record<string, 1>
  _pe: NonNullable<V4Plugin['entry']>[]
  _pt: NonNullable<V4Plugin['tags']>[]
  _pr: NonNullable<V4Plugin['resolve']>[]
  _compile: Compile
  use: (p: V4Plugin) => void
  push: (input: unknown, opts?: EntryOptions) => { patch: (input: unknown, fills?: unknown[]) => void, dispose: () => void }
  resolve: () => Tag[]
  /**
   * Atomically replace every entry in `group` with `list` in one operation:
   * one cache invalidation, no intermediate states. When the entry count is
   * unchanged the existing Entry objects are reused (a batch patch), so the
   * entry sequence and tag ordering stay stable across navigations.
   */
  swap: (group: string, list: [unknown, EntryOptions?][]) => void
}

const ESC_TEXT_RE = /[&<>"'/]/g
const ESC_TEXT: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#x27;', '/': '&#x2F;' }
const ESC_JSON_RE = /[\\"<]/g
const ESC_JSON: Record<string, string> = { '\\': '\\\\', '"': '\\"', '<': '\\u003C' }
const ESC_QUOT_RE = /"/g

// hole escape modes: 0 text, 1 attr, 2 json. `at` is the entry-level fill
// cursor: fills are shared across a plan's tuples, consumed left to right.
// text matches the SSR title escaping contract exactly (dual-path law);
// json fills splice inside a JSON string literal, so quotes and backslashes
// must escape or a fill value corrupts the document
function fillHoles(segments: string[], modes: number, fills: readonly unknown[], at: number): string {
  let out = segments[0]
  for (let i = 0; i < segments.length - 1; i++) {
    const v = String(fills[at + i] ?? '')
    const mode = modes >> (i * 2) & 3
    out += (mode === 1
      ? (v.includes('"') ? v.replace(ESC_QUOT_RE, '&quot;') : v)
      : mode === 2
        ? v.replace(ESC_JSON_RE, c => ESC_JSON[c])
        : v.replace(ESC_TEXT_RE, c => ESC_TEXT[c])) + segments[i + 1]
  }
  return out
}

export function revivePlan(plan: PlanTag[], fills: readonly unknown[] | null, seq: number): Tag[] {
  const o = seq * 4096
  // eslint-disable-next-line unicorn/no-new-array -- hot path, Array.from({length}) is larger and slower
  const tags: Tag[] = new Array(plan.length)
  let fillAt = 0
  for (let i = 0; i < plan.length; i++) {
    const t = plan[i]
    const seg = t[2]
    const isHole = typeof seg !== 'string'
    const pf = (isHole ? t[4] : t[3]) || 0
    const pos = pf & 7
    // pos 3/4 target html/body attrs; 0-2 are document buckets. pf bit 3 is
    // the arrayable flag: (pf & 8) << 4 lands exactly on F_ARRAYABLE (1 << 7)
    const f = F_PREBUILT
      | ((pf & 8) << 4)
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
const isArr = Array.isArray

export function createSwapCore(options: { ssr: boolean, compile?: Compile }): V4Head {
  const entries = new Map<number, Entry>()
  // repeated-resolve cache: collected+sorted flat tags, invalidated by
  // push/patch/dispose and by late tags-slot registration (use)
  let cAll: Tag[] | null = null
  const groups = new Map<string, number[]>()
  const head: V4Head = {
    entries,
    ssr: options.ssr,
    _c: 1,
    _pk: Object.create(null),
    _pe: [],
    _pt: [],
    _pr: [],
    _compile: options.compile || (() => {
      throw new Error('[unhead] strict core cannot compile loose input')
    }),
    use(p) {
      if (head._pk[p.key])
        return
      head._pk[p.key] = 1
      p.entry && head._pe.push(p.entry)
      if (p.tags) {
        head._pt.push(p.tags)
        // registration cliff: cached entry tags predate this slot, drop them
        // once so the next resolve rebuilds through it
        for (const e of entries.values()) e.tags = null
        cAll = null
      }
      if (p.resolve)
        head._pr.push(p.resolve)
      p.init?.(head)
    },
    push(input, opts) {
      const i = head._c++
      // tags build lazily in resolve (plan revive included) so entry/tags
      // slots registered between push and first render still apply
      const entry: Entry = {
        i,
        input,
        fills: opts?.fills || null,
        tags: null,
        opts: opts || null,
      }
      for (const fn of head._pe) fn(entry, head)
      entries.set(i, entry)
      cAll = null
      return {
        patch(next, nextFills) {
          entry.input = next
          nextFills && (entry.fills = nextFills)
          entry.tags = null
          for (const fn of head._pe) fn(entry, head)
          cAll = null
        },
        dispose() {
          entries.delete(i)
          cAll = null
        },
      }
    },
    swap(group, list) {
      const old = groups.get(group)
      if (old && old.length === list.length) {
        // steady-state navigation: reuse the Entry objects (batch patch)
        for (let j = 0; j < list.length; j++) {
          const e = entries.get(old[j])!
          const opts = list[j][1] || null
          e.input = list[j][0]
          e.opts = opts
          e.fills = opts?.fills || null
          e.tags = null
          for (const fn of head._pe) fn(e, head)
        }
      }
      else {
        if (old) {
          for (const id of old) entries.delete(id)
        }
        const ids: number[] = []
        for (let j = 0; j < list.length; j++) {
          const opts = list[j][1] || null
          const i = head._c++
          const e: Entry = { i, input: list[j][0], fills: opts?.fills || null, tags: null, opts }
          for (const fn of head._pe) fn(e, head)
          entries.set(i, e)
          ids.push(i)
        }
        groups.set(group, ids)
      }
      cAll = null
    },
    resolve() {
      let all = cAll
      if (!all) {
        let n = 0
        for (const e of entries.values()) {
          let tags = e.tags
          if (!tags) {
            // plan revive or loose compile, then per-entry tags slots; the
            // result is the entry's cache
            tags = isArr(e.input) ? revivePlan(e.input as PlanTag[], e.fills, e.i) : head._compile(e.input, e.i, e.opts)
            for (const fn of head._pt) tags = fn(tags, e, head) || tags
            e.tags = tags
          }
          n += tags.length
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

      // dedupe: byKey maps d -> slot index; slots hold a Tag or a Tag[] (arrayable append)
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
        const prev = isArr(cur) ? cur[cur.length - 1] : cur
        // arrayable identities append within the same entry; across entries the
        // later entry replaces the whole set (v3 semantics)
        if (t.f & F_ARRAYABLE && (t.o / 4096 | 0) === (prev.o / 4096 | 0)) {
          isArr(cur) ? cur.push(t) : slots[idx] = [cur, t]
          hasArrayAppend = true
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
          shared: {},
          get: (d) => {
            const s = slots[byKey[d]]
            return isArr(s) ? s[0] : s
          },
          each: fn => slots.forEach(s => isArr(s) ? s.forEach(fn) : fn(s)),
          patch: (tag, changes) => {
            const next = { ...tag, ...changes }
            // slot containers are per-resolve, safe to write; only the
            // entry-cached Tag objects themselves are shared
            const idx = byKey[tag.d]
            // eslint-disable-next-line node/prefer-global/process -- bundler-defined NODE_ENV; minifiers strip the whole branch
            if (process.env.NODE_ENV !== 'production' && idx === undefined)
              console.warn(`[unhead] patch() target is not in the resolved set (d: "${tag.d}"); the change will not render`)
            const s = slots[idx]
            if (isArr(s)) {
              const j = s.indexOf(tag)
              if (j >= 0)
                s[j] = next
            }
            else if (s === tag) {
              slots[idx] = next
            }
            return next
          },
          head,
        }
        for (let i = 0; i < head._pr.length; i++) head._pr[i](ctx)
      }

      // flatten; removed tags are skipped at render, kept here to preserve indices.
      // arrayable appends (multiple og:image sets) re-sort by (w, o) so structured
      // sub-properties stay adjacent to their parent (v3 sortFlatMeta parity: the
      // OG spec requires og:image:width to follow its og:image)
      const out = slots.flat()
      if (hasArrayAppend)
        out.sort(sortTags)
      return out
    },
  }
  return head
}
