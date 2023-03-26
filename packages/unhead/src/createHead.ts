import { createHooks } from 'hookable'
import type {
  CreateHeadOptions,
  Head,
  HeadEntry,
  HeadHooks,
  HeadPlugin,
  HeadTag, ResolvedHeadTag,
  Unhead,
  UnheadState,
} from '@unhead/schema'
import {
  DedupesTagsPlugin,
  DeprecatedPlugin,
  ProvideTagHashPlugin,
  SortTagsPlugin,
  TemplateParamsPlugin,
  TitleTemplatePlugin,
} from './plugin'
import { normaliseEntryTags } from './utils'

export const CorePlugins = () => [
  // dedupe needs to come first
  DedupesTagsPlugin(),
  SortTagsPlugin(),
  TemplateParamsPlugin(),
  TitleTemplatePlugin(),
  ProvideTagHashPlugin(),
  // EventHandlersPlugin(),
  DeprecatedPlugin(),
]


/**
 * Creates a core instance of unhead. Does not provide a global ctx for composables to work
 * and does not register DOM plugins.
 *
 * @param options
 */
export function createHeadCore<T extends {} = Head>(options: CreateHeadOptions = {}) {
  let entries: HeadEntry<T>[] = []
  // counter for keeping unique ids of head object entries
  let _eid = 0
  const state: UnheadState = {}
  const hooks = createHooks<HeadHooks>()
  options?.hooks && hooks.addHooks(options.hooks)

  const head: Unhead<T> = {
    resolvedOptions: options,
    headEntries() {
      return entries
    },
    get hooks() {
      return hooks
    },
    use(plugin: HeadPlugin) {
      if (plugin.hooks)
        hooks.addHooks(plugin.hooks)
    },
    push(input, options) {
      const activeEntry: HeadEntry<T> = { _i: _eid++, input }
      // if a mode is provided via options, set it
      options?.mode && (activeEntry._m = options?.mode)
      // used for useHeadSafe
      // @ts-expect-error untyped
      options?.transform && (activeEntry._t = options?.transform)

      entries.push(activeEntry)
      return {
        dispose() {
          entries = entries.filter(e => e._i !== activeEntry._i)
        },
        // a patch is the same as creating a new entry, just a nice DX
        patch(input) {
          entries = entries.map((e) => {
            // bit hacky syncing
            e._i === activeEntry._i && (activeEntry.input = e.input = input)
            return e
          })
        },
      }
    },
    async resolveTags() {
      const resolveCtx: { tags: HeadTag[]; entries: HeadEntry<T>[] } = { tags: [], entries: [...entries] }
      await hooks.callHook('entries:resolve', resolveCtx)
      for (const entry of resolveCtx.entries) {
        // apply any custom transformers applied to the entry
        const transformer = entry._t || (i => i)
        entry.resolvedInput = transformer(entry.resolvedInput || entry.input)
        for (const tag of await normaliseEntryTags<T>(entry)) {
          const tagCtx = { tag, entry, resolvedOptions: head.resolvedOptions }
          await hooks.callHook('tag:normalise', tagCtx)
          resolveCtx.tags.push(tagCtx.tag)
        }
      }
      const resolvedCtx = {
        tags: resolveCtx.tags as ResolvedHeadTag[],
        entries: resolveCtx.entries
      }
      await hooks.callHook('tags:resolve', resolvedCtx)
      return resolvedCtx.tags
    },
    state,
  }
  // set a proxy on entries, when it updates we will trigger the entires:updated hook
  entries = new Proxy(entries, {
    set(target, key, value) {
      hooks.callHook('entries:updated', head)
      return Reflect.set(target, key, value)
    },
  })

  options.plugins = [
    ...CorePlugins(),
    ...(options?.plugins || []),
  ]
  options.plugins.forEach((p) => {
    // @ts-expect-error untyped
    p = typeof p === 'function' ? p(head) : p
    p.hooks && hooks.addHooks(p.hooks)
  })
  return head
}
