import { createHooks } from 'hookable'
import type {
  CreateHeadOptions,
  Head,
  HeadEntry,
  HeadHooks,
  HeadPlugin,
  HeadTag,
  Unhead,
} from '@unhead/schema'
import { PatchDomOnEntryUpdatesPlugin } from '@unhead/dom'
import { IsBrowser, normaliseEntryTags } from '@unhead/shared'
import DedupePlugin from './plugins/dedupe'
import EventHandlersPlugin from './plugins/eventHandlers'
import HashKeyedPLugin from './plugins/hashKeyed'
import SortPLugin from './plugins/sort'
import TemplateParamsPlugin from './plugins/templateParams'
import TitleTemplatePlugin from './plugins/titleTemplate'

// TODO drop support for non-context head
// eslint-disable-next-line import/no-mutable-exports
export let activeHead: Unhead<any> | undefined

// TODO rename to createDomHead
/* @__NO_SIDE_EFFECTS__ */ export function createHead<T extends {} = Head>(options: CreateHeadOptions = {}) {
  const head = createHeadCore<T>(options)
  if (!head.ssr)
    head.use(PatchDomOnEntryUpdatesPlugin())

  return activeHead = head
}

/* @__NO_SIDE_EFFECTS__ */ export function createServerHead<T extends {} = Head>(options: CreateHeadOptions = {}) {
  const head = createHeadCore<T>({
    ...options,
    mode: 'server',
  })
  return activeHead = head
}

/**
 * Creates a core instance of unhead. Does not provide a global ctx for composables to work
 * and does not register DOM plugins.
 *
 * @param options
 */
export function createHeadCore<T extends {} = Head>(options: CreateHeadOptions = {}) {
  // counter for keeping unique ids of head object entries
  const hooks = createHooks<HeadHooks>()
  hooks.addHooks(options.hooks || {})

  options.plugins = [
    DedupePlugin,
    EventHandlersPlugin,
    HashKeyedPLugin,
    SortPLugin,
    TemplateParamsPlugin,
    TitleTemplatePlugin,
    ...(options?.plugins || []),
  ]
  options.plugins.forEach(p => hooks.addHooks(p.hooks || {}))
  options.document = options.document || (IsBrowser ? document : undefined)
  const ssr = !options.document
  const updated = () => hooks.callHook('entries:updated', head)
  let entryCount = 0
  let entries: HeadEntry<T>[] = []
  const head: Unhead<T> = {
    resolvedOptions: options,
    hooks,
    headEntries() {
      return entries
    },
    use(plugin: HeadPlugin) {
      if (plugin.hooks)
        hooks.addHooks(plugin.hooks)
    },
    push(input, entryOptions) {
      const activeEntry: HeadEntry<T> = {
        _i: entryCount++,
        input,
        ...entryOptions as Partial<HeadEntry<T>>,
      }
      const mode = activeEntry?.mode || options.mode
      // if a mode is provided via options, set it
      if (mode)
        activeEntry.mode = mode
      // bit hacky but safer
      if ((options.mode === 'server' && ssr) || (options.mode === 'client' && !ssr) || !options.mode) {
        entries.push(activeEntry)
        updated()
      }
      return {
        dispose() {
          entries = entries.filter(e => e._i !== activeEntry._i)
          hooks.callHook('entries:updated', head)
          updated()
        },
        // a patch is the same as creating a new entry, just a nice DX
        patch(input) {
          entries = entries.map((e) => {
            if (e._i === activeEntry._i) {
              // bit hacky syncing
              activeEntry.input = e.input = input
            }
            return e
          })
          updated()
        },
      }
    },
    async resolveTags() {
      const resolveCtx: { tags: HeadTag[]; entries: HeadEntry<T>[] } = { tags: [], entries: [...entries] }
      await hooks.callHook('entries:resolve', resolveCtx)
      for (const entry of resolveCtx.entries) {
        // apply any custom transformers applied to the entry
        const resolved = entry.resolvedInput || entry.input
        entry.resolvedInput = await (entry.transform ? entry.transform(resolved) : resolved) as T
        if (entry.resolvedInput) {
          for (const tag of await normaliseEntryTags<T>(entry)) {
            const tagCtx = { tag, entry, resolvedOptions: head.resolvedOptions }
            await hooks.callHook('tag:normalise', tagCtx)
            resolveCtx.tags.push(tagCtx.tag)
          }
        }
      }
      await hooks.callHook('tags:beforeResolve', resolveCtx)
      await hooks.callHook('tags:resolve', resolveCtx)
      return resolveCtx.tags
    },
    ssr,
  }

  head.hooks.callHook('init', head)
  return head
}
