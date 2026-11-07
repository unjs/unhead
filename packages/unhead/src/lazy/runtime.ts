import type { ClientUnhead } from '../client/adapter'
import type { HeadEntry, HeadRenderer } from '../types'
import type { CreateLazyHeadOptions } from './index'
import { createDomRenderer } from '../client/renderDOMHead'
import { createDebouncedFn, tagWeight } from '../client/util'

// A change before the runtime loaded may have dropped or re-keyed an entry, leaving
// its server element unknown to the renderer. Rendering the hydrated entries first
// adopts those elements, so the next render removes the stale ones. The pause and
// render hooks stay silent, because this render is internal and must not wait. The
// render reads a separate map, so an entry that a hook pushes or disposes during it
// changes the live map through the entry, and the restore keeps that change.
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
  }
}

export async function upgradeHead<T>(head: ClientUnhead<T>, options: CreateLazyHeadOptions, adoptionEntries: () => HeadEntry<T>[]): Promise<HeadRenderer<any>> {
  const plugins = await options.lazyPlugins?.()
  head.resolvedOptions._tagWeight = tagWeight
  plugins?.forEach(p => head.use(p))
  const renderDom = createDomRenderer({ document: head.resolvedOptions.document })
  // A custom renderer owns the document, as with v3 `createHead`, so the default one never adopts
  if (head.dirty && !options.render)
    adoptHydratedEntries(head, renderDom, adoptionEntries())
  return (options.render as HeadRenderer<any>) || createDebouncedFn(() => renderDom(head), fn => setTimeout(fn, 0))
}
