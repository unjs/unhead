import { createHooks } from 'hookable'
import type { Head, HeadTag } from '@unhead/schema'
import { setActiveHead } from './state'
import type { CreateHeadOptions, HeadClient, HeadEntry, HeadHooks, SideEffectsRecord } from './types'
import type { HeadPlugin } from './plugin'
import { dedupePlugin, sortPlugin, titleTemplatePlugin } from './plugin'
import { normaliseEntryTags } from './normalise'

export function createHead<T extends {} = Head>(options: CreateHeadOptions<T> = {}) {
  let entries: HeadEntry<T>[] = []
  // queued side effects
  let _sde: SideEffectsRecord = {}
  // counter for keeping unique ids of head object entries
  let entryId = 0
  const hooks = createHooks<HeadHooks<T>>()
  if (options.hooks)
    hooks.addHooks(options.hooks)

  const plugins: HeadPlugin<any>[] = [
    // order is important
    dedupePlugin,
    sortPlugin,
    titleTemplatePlugin,
  ]
  plugins.push(...(options.plugins || []))
  plugins.forEach(plugin => hooks.addHooks(plugin.hooks || {}))

  const head: HeadClient<T> = {
    entries,
    _flushDomSideEffects() {
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
      return {
        dispose() {
          entries = entries.filter((e) => {
            if (e._i !== _i)
              return true
            // queue side effects
            _sde = {
              ..._sde,
              ...e._sde || {},
            }
            return false
          })
        },
        patch(input) {
          entries = entries.map((e) => {
            e.input = e._i === _i ? input : e.input
            return e
          })
        },
      }
    },
    async resolveTags() {
      await hooks.callHook('entries:resolve', head)
      const tags: HeadTag[] = entries.map(entry => normaliseEntryTags<T>(entry)).flat()
      for (const k in tags) {
        const tagCtx = { tag: tags[k], entry: entries.find(e => e._i === tags[k]._e)! }
        await hooks.callHook('tag:normalise', tagCtx)
        tags[k] = tagCtx.tag
      }
      const ctx = { tags }
      await hooks.callHook('tags:beforeResolve', ctx)
      await hooks.callHook('tags:resolve', ctx)
      return ctx.tags
    },
  }

  setActiveHead(head)
  return head
}

