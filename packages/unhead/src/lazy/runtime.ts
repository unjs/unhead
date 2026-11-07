import type { ClientUnhead } from '../client/adapter'
import type { HeadEntry, HeadRenderer } from '../types'
import type { CreateLazyHeadOptions } from './index'
import { createDomRenderer } from '../client/renderDOMHead'
import { createDebouncedFn, tagWeight } from '../client/util'

// A change before the runtime loaded may have dropped or re-keyed an entry, leaving
// its server element unknown to the renderer. Rendering the hydrated entries first
// adopts those elements, so the next render removes the stale ones. The pause and
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

export async function upgradeHead<T>(head: ClientUnhead<T>, options: CreateLazyHeadOptions, adoptionEntries: () => HeadEntry<T>[]): Promise<HeadRenderer<any>> {
  const plugins = await options.lazyPlugins?.()
  head.resolvedOptions._tagWeight = tagWeight
  plugins?.forEach(p => head.use(p))
  const renderDom = createDomRenderer({ document: head.resolvedOptions.document })
  if (head.dirty)
    adoptHydratedEntries(head, renderDom, adoptionEntries())
  return (options.render as HeadRenderer<any>) || createDebouncedFn(() => renderDom(head), fn => setTimeout(fn, 0))
}
