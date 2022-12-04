import { createHooks } from 'hookable'
import type { CreateHeadOptions, Head, HeadEntry, HeadHooks, HeadTag, SideEffectsRecord, Unhead } from '@unhead/schema'
import { setActiveHead } from './runtime/state'
import {
  DedupesTagsPlugin,
  DeprecatedTagAttrPlugin,
  EventHandlersPlugin,
  PatchDomOnEntryUpdatesPlugin, ProvideTagHashPlugin,
  SortTagsPlugin,
  TitleTemplatePlugin,
} from './plugin'
import { normaliseEntryTags } from './normalise'

export const CorePlugins = () => [
  // dedupe needs to come first
  DedupesTagsPlugin(),
  SortTagsPlugin(),
  TitleTemplatePlugin(),
  ProvideTagHashPlugin(),
  EventHandlersPlugin(),
  DeprecatedTagAttrPlugin(),
]

export const DOMPlugins = (options: CreateHeadOptions = {}) => [
  PatchDomOnEntryUpdatesPlugin({ document: options?.document, delayFn: options?.domDelayFn }),
]

export function createHead<T extends {} = Head>(options: CreateHeadOptions = {}) {
  const head = createHeadCore<T>({
    ...options,
    plugins: [...DOMPlugins(options), ...(options?.plugins || [])],
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
  let entries: HeadEntry<T>[] = []
  // queued side effects
  let _sde: SideEffectsRecord = {}
  // counter for keeping unique ids of head object entries
  let _eid = 0
  const hooks = createHooks<HeadHooks>()
  if (options?.hooks)
    hooks.addHooks(options.hooks)

  options.plugins = [
    ...CorePlugins(),
    ...(options?.plugins || []),
  ]
  options.plugins.forEach(p => p.hooks && hooks.addHooks(p.hooks))

  // does the dom rendering by default
  // es-lint-disable-next-line @typescript-eslint/no-use-before-define
  const updated = () => hooks.callHook('entries:updated', head)

  const head: Unhead<T> = {
    resolvedOptions: options,
    headEntries() {
      return entries
    },
    get hooks() {
      return hooks
    },
    push(input, options) {
      const activeEntry: HeadEntry<T> = {
        _i: _eid++,
        input,
        _sde: {},
      }
      // if a mode is provided via options, set it
      if (options?.mode)
        activeEntry._m = options?.mode
      entries.push(activeEntry)
      updated()
      return {
        dispose() {
          entries = entries.filter((e) => {
            if (e._i !== activeEntry._i)
              return true
            // queue side effects
            _sde = { ..._sde, ...e._sde || {} }
            e._sde = {}
            updated()
            return false
          })
        },
        // a patch is the same as creating a new entry, just a nice DX
        patch(input) {
          entries = entries.map((e) => {
            if (e._i === activeEntry._i) {
              // bit hacky syncing
              activeEntry.input = e.input = input
              updated()
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
        for (const tag of await normaliseEntryTags<T>(entry)) {
          const tagCtx = { tag, entry }
          await hooks.callHook('tag:normalise', tagCtx)
          resolveCtx.tags.push(tagCtx.tag)
        }
      }
      await hooks.callHook('tags:resolve', resolveCtx)
      return resolveCtx.tags
    },
    _elMap: {},
    _popSideEffectQueue() {
      const sde = { ..._sde }
      _sde = {}
      return sde
    },
  }

  head.hooks.callHook('init', head)
  return head
}

