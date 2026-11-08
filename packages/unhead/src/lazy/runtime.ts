import type { ClientUnhead } from '../client/adapter'
import type { HeadEntry, HeadRenderer } from '../types'
import type { CreateLazyHeadOptions, LazyUnhead } from './index'
import { createDomRenderer } from '../client/renderDOMHead'
import { createDebouncedFn, tagWeight } from '../client/util'
import { toHeadInput } from '../compiled/tags'

// Set by the `@unhead/bundler` plugin. Undefined outside it, so the guard reads `typeof` first.
declare const __UNHEAD_COMPILE_DEBUG__: boolean | undefined

// A change since hydration may have dropped or re-keyed an entry, leaving its server
// element unknown to the renderer. Rendering the hydrated entries first adopts those
// elements, so the next render removes the stale ones. A claim wins a tie with its entry,
// so a tag that a patch emptied still adopts its server element. The pause and render hooks
// stay silent, because this render is internal and must not wait. The render reads a separate
// map, so an entry that a hook pushes or disposes during it changes the live map through
// the entry, and the restore keeps that change.
function adoptHydratedEntries<T>(head: ClientUnhead<T>, renderDom: HeadRenderer<boolean>, hydrated: HeadEntry<T>[]) {
  const hooks = (head.hooks as any)._hooks
  const pause = hooks['dom:beforeRender']
  const rendered = hooks['dom:rendered']
  const live = head.entries
  hooks['dom:beforeRender'] = hooks['dom:rendered'] = undefined
  // A lookup by id falls back to the live map, so a hook that disposes or pushes an entry
  // outside the adoption, such as a client only entry, still finds it.
  const adoption = new Map(hydrated.map(entry => [entry._i, entry]))
  const { get, has } = adoption
  adoption.get = id => get.call(adoption, id) ?? live.get(id)
  adoption.has = id => has.call(adoption, id) || live.has(id)
  head.entries = adoption
  try {
    renderDom(head)
  }
  finally {
    hooks['dom:beforeRender'] = pause
    hooks['dom:rendered'] = rendered
    head.entries = live
    head.dirty = true
  }
}

// The full runtime reads loose input, so a compiled entry turns back into the input it came from.
// Its values stay in the entry options until then. A hydrated copy shares those options, so
// they are replaced, never changed.
function toLooseEntry(entry: HeadEntry<any>) {
  const { values, ...options } = entry.options as Record<string, any>
  for (const key of ['input', '_pending', '_o'] as const) {
    if (Array.isArray(entry[key]))
      entry[key] = toHeadInput(entry[key], values)
  }
  entry.options = options
}

export async function upgradeHead<T>(head: ClientUnhead<T>, options: CreateLazyHeadOptions, adoptionEntries: () => HeadEntry<T>[]): Promise<HeadRenderer<any>> {
  // A debug signal: the first entry without compiled tags. The compiled runtime records its
  // own causes before it loads this one, so the first cause stays. Only `compile: { debug: true }`
  // keeps it: the bundler plugin sets the constant, and the minifier drops it otherwise.
  if (typeof __UNHEAD_COMPILE_DEBUG__ !== 'undefined' && __UNHEAD_COMPILE_DEBUG__) {
    const entry = [...head.entries.values()].find(entry => !Array.isArray(entry._pending ?? entry.input))
    if (entry)
      (head as LazyUnhead<T>)._fullRuntimeReason ||= { _tag: 'Entry', entry }
  }
  const plugins = await options.lazyPlugins?.()
  head.resolvedOptions._tagWeight = tagWeight
  plugins?.forEach(p => head.use(p))
  const renderDom = createDomRenderer({ document: head.resolvedOptions.document })
  // the compiled runtime rendered already, so its state holds what the hydrated entries would adopt
  if (head._dom)
    (head._dom as any)._l = new Map()
  // A custom renderer owns the document, as with v3 `createHead`, so the default one never adopts.
  // Adoption waits for the first render that creates the DOM state, so a change after the
  // load, in the debounce or during a pause, still adopts. `dirty` means changed since hydration.
  const render = (options.render as HeadRenderer<any>) || createDebouncedFn(() => {
    if (!head._dom && head.dirty) {
      const hydrated = adoptionEntries()
      hydrated.forEach(toLooseEntry)
      adoptHydratedEntries(head, renderDom, hydrated)
    }
    renderDom(head)
  }, fn => setTimeout(fn, 0))
  return (h) => {
    head.entries.forEach(toLooseEntry)
    return render(h)
  }
}
