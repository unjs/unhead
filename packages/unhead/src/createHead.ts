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

export function createHead<T extends {} = Head>(options: CreateHeadOptions = {}) {
  let entries: HeadEntry<T>[] = []
  // queued side effects
  let _sde: SideEffectsRecord = {}
  // counter for keeping unique ids of head object entries
  let _eid = 0
  const hooks = createHooks<HeadHooks>()
  if (options?.hooks)
    hooks.addHooks(options.hooks)

  options.plugins = [
    // order is important
    DeprecatedTagAttrPlugin(),
    DedupesTagsPlugin(),
    SortTagsPlugin(),
    TitleTemplatePlugin(),
    EventHandlersPlugin(),
    ProvideTagHashPlugin(),
    PatchDomOnEntryUpdatesPlugin({ document: options?.document, delayFn: options?.domDelayFn }),
    ...(options?.plugins || []),
  ]
  options.plugins.forEach(p => p.hooks && hooks.addHooks(p.hooks))

  // does the dom rendering by default
  const triggerUpdateHook = () => hooks.callHook('entries:updated', head)

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
      triggerUpdateHook()
      const queueSideEffects = (e: HeadEntry<T>) => {
        // queue side effects
        _sde = { ..._sde, ...e._sde || {} }
        e._sde = {}
        triggerUpdateHook()
      }
      return {
        dispose() {
          entries = entries.filter((e) => {
            if (e._i !== activeEntry._i)
              return true
            queueSideEffects(e)
            return false
          })
        },
        // a patch is the same as creating a new entry, just a nice DX
        patch(input) {
          entries = entries.map((e) => {
            if (e._i === activeEntry._i) {
              queueSideEffects(e)
              // bit hacky syncing
              activeEntry.input = e.input = input
              // assign a new entry id so we can clean up the old data
              activeEntry._i = e._i = _eid++
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
        for (const tag of normaliseEntryTags<T>(entry)) {
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
  // @ts-expect-error broken type
  setActiveHead(head)
  return head
}

