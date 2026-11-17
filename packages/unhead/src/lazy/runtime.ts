import type { ClientUnhead } from '../client/adapter'
import type { HeadEntry, HeadRenderer } from '../types'
import type { LazyHeadOptions } from './index'
import { adoptDOMHead, createDomRenderer } from '../client/renderDOMHead'
import { tagWeight } from '../client/tagWeight'
import { createDebouncedFn } from '../client/util'

// A change since hydration may have dropped or re-keyed an entry, leaving its server
// element unknown to the renderer. Adopt only existing elements without replaying
// historical writes, so the next render removes stale ones. Respect rendering pauses.
// Adoption reads a separate map, so an entry a hook pushes or disposes changes the live map through
// the entry, and the restore keeps that change.
function adoptHydratedEntries<T>(head: ClientUnhead<T>, hydrated: HeadEntry<T>[]) {
  const live = head.entries
  // A lookup by id falls back to the live map, so a hook that disposes or pushes an entry
  // outside the adoption, such as a client only entry, still finds it.
  const adoption = new Map(hydrated.map(entry => [entry._i, entry]))
  const { get, has } = adoption
  adoption.get = id => get.call(adoption, id) ?? live.get(id)
  adoption.has = id => has.call(adoption, id) || live.has(id)
  head.entries = adoption
  try {
    return adoptDOMHead(head)
  }
  finally {
    head.entries = live
    head.dirty = true
  }
}

export async function upgradeHead<T>(head: ClientUnhead<T>, options: LazyHeadOptions, useLazyPlugins: () => Promise<void>, hydrated: () => HeadEntry<T>[]): Promise<HeadRenderer<any>> {
  await useLazyPlugins()
  head.resolvedOptions._tagWeight = tagWeight
  const renderDom = createDomRenderer({ document: head.resolvedOptions.document })
  // A custom renderer owns the document, as with v3 `createHead`, so the default one never adopts.
  // The first render that creates the DOM state adopts first, so a change after the load,
  // in the debounce or during a pause, still adopts. A pause holds both. With no hydrated
  // entries there is no server head to adopt.
  return (options.render as HeadRenderer<any>) || createDebouncedFn(() => {
    if (head._dom || !hydrated().length || adoptHydratedEntries(head, hydrated()))
      renderDom(head)
  }, fn => setTimeout(fn, 0))
}
