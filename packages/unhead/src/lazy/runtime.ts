import type { ClientUnhead } from '../client/adapter'
import type { HeadEntry, HeadRenderer } from '../types'
import type { CreateLazyHeadOptions } from './index'
import { createDomRenderer } from '../client/renderDOMHead'
import { createDebouncedFn, tagWeight } from '../client/util'
import { toHeadInput } from '../compiled/tags'

// A change before the runtime loaded may have dropped or re-keyed an entry, leaving
// its server element unknown to the renderer. Rendering the hydrated entries first
// adopts those elements, so the next render removes the stale ones. A claim wins a tie with
// its entry, so a tag that a patch emptied still adopts its server element. The pause and
// render hooks stay silent, because this render is internal and must not wait.
function adoptHydratedEntries<T>(head: ClientUnhead<T>, renderDom: HeadRenderer<boolean>, hydrated: HeadEntry<T>[]) {
  const hooks = (head.hooks as any)._hooks
  const pause = hooks['dom:beforeRender']
  const rendered = hooks['dom:rendered']
  const live = [...head.entries.values()]
  const setEntries = (entries: HeadEntry<T>[]) => {
    head.entries.clear()
    for (const entry of entries)
      head.entries.set(entry._i, entry)
  }
  hooks['dom:beforeRender'] = hooks['dom:rendered'] = undefined
  setEntries(hydrated)
  try {
    renderDom(head)
  }
  finally {
    hooks['dom:beforeRender'] = pause
    hooks['dom:rendered'] = rendered
    setEntries(live)
  }
}

// The v3 pipeline reads loose input, so a compiled entry turns back into the input it came from.
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
  const plugins = await options.lazyPlugins?.()
  head.resolvedOptions._tagWeight = tagWeight
  plugins?.forEach(p => head.use(p))
  await (head.plugins.get('template-params') as any)?._load?.(head)
  const renderDom = createDomRenderer({ document: head.resolvedOptions.document })
  const state = head._dom as any
  // the compiled runtime rendered already, so its state holds what the hydrated entries would adopt
  if (state) {
    state._l = new Map()
  }
  else if (head.dirty) {
    const hydrated = adoptionEntries()
    hydrated.forEach(toLooseEntry)
    adoptHydratedEntries(head, renderDom, hydrated)
  }
  const render = (options.render as HeadRenderer<any>) || createDebouncedFn(() => renderDom(head), fn => setTimeout(fn, 0))
  return (h) => {
    head.entries.forEach(toLooseEntry)
    return render(h)
  }
}
