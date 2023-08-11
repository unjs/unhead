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
import { IsBrowser } from '@unhead/shared'
import { setActiveHead } from './runtime/state'
import {
  DedupesTagsPlugin,
  EventHandlersPlugin,
  ProvideTagKeyHash,
  SortTagsPlugin,
  TemplateParamsPlugin,
  TitleTemplatePlugin,
} from './plugin'
import { normaliseEntryTags } from './utils'

/* @__NO_SIDE_EFFECTS__ */ export function DOMPlugins(options: CreateHeadOptions = {}) {
  return [
    PatchDomOnEntryUpdatesPlugin({ document: options?.document, delayFn: options?.domDelayFn }),
  ]
}

/* @__NO_SIDE_EFFECTS__ */ export function createHead<T extends {} = Head>(options: CreateHeadOptions = {}) {
  const head = createHeadCore<T>({
    ...options,
    plugins: [...DOMPlugins(options), ...(options?.plugins || [])],
  })
  setActiveHead(head)
  return head
}

/* @__NO_SIDE_EFFECTS__ */ export function createServerHead<T extends {} = Head>(options: CreateHeadOptions = {}) {
  const head = createHeadCore<T>({
    ...options,
    mode: 'server',
  })
  setActiveHead(head)
  return head
}

/**
 * Creates a core instance of unhead. Does not provide a global ctx for composables to work
 * and does not register DOM plugins.
 *
 * @param options
 */
export function createHeadCore<T extends {} = Head>(options: CreateHeadOptions = {}) {
  let entries: HeadEntry<T>[] = new Proxy([], {
    set(target, prop, value) {
      // @ts-expect-error untyped
      target[prop] = value
      hooks.callHook('entries:updated', head)
      return true
    },
  })
  // counter for keeping unique ids of head object entries
  let _eid = 0
  const hooks = createHooks<HeadHooks>()
  if (options?.hooks)
    hooks.addHooks(options.hooks)

  options.plugins = [
    DedupesTagsPlugin(),
    SortTagsPlugin(),
    TemplateParamsPlugin(),
    TitleTemplatePlugin(),
    ProvideTagKeyHash(),
    EventHandlersPlugin(),
    ...(options?.plugins || []),
  ]
  options.plugins.forEach(p => p.hooks && hooks.addHooks(p.hooks))
  options.document = options.document || (IsBrowser ? document : undefined)
  const ssr = !options.document

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
        _i: _eid++,
        input,
        ...entryOptions as Partial<HeadEntry<T>>,
      }
      const mode = activeEntry?.mode || options.mode
      // if a mode is provided via options, set it
      if (mode)
        activeEntry.mode = mode
      // bit hacky but safer
      if ((options.mode === 'server' && ssr) || (options.mode === 'client' && !ssr) || !options.mode)
        entries.push(activeEntry)
      return {
        dispose() {
          entries = entries.filter(e => e._i !== activeEntry._i)
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
