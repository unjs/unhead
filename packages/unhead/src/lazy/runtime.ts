import type { ClientUnhead } from '../client/adapter'
import type { StreamingGlobal } from '../stream/types'
import type { HeadEntry, HeadRenderer } from '../types'
import type { LazyHeadOptions } from './index'
import { renderLazyDOMHead } from '../client/renderDOMHead'
import { tagWeight } from '../client/tagWeight'
import { attachStreamHead } from '../stream/queue'

// A change since hydration may have dropped or re-keyed an entry, leaving its server
// element unknown to the renderer. Adopt only existing elements without replaying
// historical writes, so the next render removes stale ones. Respect rendering pauses.
// Adoption reads a separate map, so an entry a hook pushes or disposes changes the live map through
// the entry, and the restore keeps that change.
function adoptHydratedEntries<T>(head: ClientUnhead<T>, hydrated: HeadEntry<T>[]) {
  const live = head.entries
  const adoption = new Map(hydrated.map(entry => [entry._i, entry]))
  // A lookup by id falls back to the live map, so a hook that disposes or pushes an entry
  // outside the adoption, such as a client only entry, still finds it. An entry is an object,
  // so `has` is a lookup that found one.
  const get = adoption.get.bind(adoption)
  adoption.get = id => get(id) || live.get(id)
  adoption.has = id => !!adoption.get(id)
  head.entries = adoption
  try {
    return renderLazyDOMHead(head, {}, true)
  }
  finally {
    head.entries = live
    head.dirty = true
  }
}

export function upgradeHead<T>(head: ClientUnhead<T>, options: LazyHeadOptions, hydrated: () => HeadEntry<T>[], stream?: StreamingGlobal): HeadRenderer<any> {
  head.resolvedOptions._tagWeight = tagWeight
  if (stream && stream._head !== head) {
    if (stream._head)
      throw new Error('[unhead] This stream already has a client head.')
    // Reserve earlier entry positions so late SSR patches cannot override live client entries.
    let index = -(1 << 20)
    attachStreamHead(stream, head, input => head.push(input as T, { _index: index++ })._i)
  }
  let renderId = 0
  // A custom renderer owns the document, as with v3 `createHead`, so the default one never adopts.
  // The default one batches the changes of a task into one render, as the Vue client head does.
  // The first render that creates the DOM state adopts first, so a change after the load,
  // in the debounce or during a pause, still adopts. A pause holds both. With no hydrated
  // entries there is no server head to adopt.
  return (options.render as HeadRenderer<any>) || (() => {
    const id = ++renderId
    setTimeout(() => {
      if (id === renderId && (head._dom || !hydrated().length || adoptHydratedEntries(head, hydrated())))
        renderLazyDOMHead(head)
    })
  })
}
