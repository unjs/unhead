import { createHooks } from 'hookable'
import type { CreateHeadOptions, Head, HeadClient, HeadEntry, HeadHooks, HeadPlugin, HeadTag, SideEffectsRecord } from '@unhead/schema'
import { setActiveHead } from './runtime/state'
import { DedupesTagsPlugin, SortTagsPlugin, TitleTemplatePlugin } from './plugin'
import { normaliseEntryTags } from './normalise'

export async function createHead<T extends {} = Head>(options: CreateHeadOptions = {}) {
  let entries: HeadEntry<T>[] = []
  // queued side effects
  let _sde: SideEffectsRecord = {}
  // counter for keeping unique ids of head object entries
  let entryId = 0
  const hooks = createHooks<HeadHooks>()
  if (options.hooks)
    hooks.addHooks(options.hooks)

  const plugins: HeadPlugin[] = [
    // order is important
    DedupesTagsPlugin(),
    SortTagsPlugin(),
    TitleTemplatePlugin(),
  ]
  plugins.push(...(options.plugins || []))
  plugins.forEach(plugin => hooks.addHooks(plugin.hooks || {}))

  const head: HeadClient<T> = {
    _removeQueuedSideEffect(key) {
      delete _sde[key]
    },
    _flushQueuedSideEffects() {
      Object.values(_sde).forEach(fn => fn())
      _sde = {}
    },
    headEntries() {
      return entries
    },
    get hooks() {
      return hooks
    },
    push(input, options) {
      const _i = entryId++
      entries.push({
        _i,
        input,
        _sde: {},
        ...options,
      })
      hooks.callHook('entries:updated', head)
      return {
        dispose() {
          entries = entries.filter((e) => {
            if (e._i !== _i)
              return true
            // queue side effects
            _sde = { ..._sde, ...e._sde || {} }
            e._sde = {}
            return false
          })
          hooks.callHook('entries:updated', head)
        },
        patch(input) {
          entries = entries.map((e) => {
            if (e._i === _i) {
              _sde = { ..._sde, ...e._sde || {} }
              e._sde = {}
              e.input = e._i === _i ? input : e.input
            }
            return e
          })
          hooks.callHook('entries:updated', head)
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
  }

  await head.hooks.callHook('init', head)
  // @ts-expect-error broken type
  setActiveHead(head)
  return head
}

