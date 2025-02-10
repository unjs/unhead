import type {
  ActiveHeadEntry,
  CreateHeadOptions,
  Head,
  HeadEntry,
  HeadHooks,
  HeadPlugin,
  HeadPluginInput,
  HeadTag,
  RuntimeMode,
  Unhead,
} from './types'
import { createHooks } from 'hookable'
import { isMetaArrayDupeKey, sortTags, tagWeight, UsesMergeStrategy, ValidHeadTags } from './utils'
import { normalizeEntryToTags } from './utils/normalize'
import { tagDedupeKey } from './utils/tagDedupeKey'

function filterMode(mode: RuntimeMode | undefined, ssr: boolean) {
  return !mode || (mode === 'server' && ssr) || (mode === 'client' && !ssr)
}

function registerPlugins(head: Unhead<any>, plugins: HeadPluginInput[], ssr: boolean) {
  plugins.forEach((p) => {
    const plugin = (typeof p === 'function' ? p(head) : p)
    const exists = head.plugins.get(plugin.key)
    if (!exists && filterMode(plugin.mode, ssr)) {
      head.plugins.set(plugin.key, plugin)
      head.hooks.addHooks(plugin.hooks || {})
    }
  })
}

/**
 * Creates a core instance of unhead. Does not provide a global ctx for composables to work
 * and does not register DOM plugins.
 */
export function createHeadCore<T extends Record<string, any> = Head>(resolvedOptions: CreateHeadOptions = {}) {
  // counter for keeping unique ids of head object entries
  const hooks = createHooks<HeadHooks>()
  hooks.addHooks(resolvedOptions.hooks || {})
  const ssr = !resolvedOptions.document

  const entries: Map<number, HeadEntry<T>> = new Map()
  const plugins: Map<string, HeadPlugin> = new Map()
  const head: Unhead<T> = {
    _entryCount: 1, // 0 is reserved for internal use
    plugins,
    dirty: false,
    resolvedOptions,
    hooks,
    ssr,
    entries,
    headEntries() {
      return [...entries.values()]
    },
    use(p: HeadPluginInput) {
      registerPlugins(head, [p], ssr)
    },
    push(input, _options = {}) {
      const options = { ..._options } as Required<HeadEntry<any>>['options']
      // @ts-expect-error untyped
      delete options.head
      const _i = head._entryCount++
      const _: ActiveHeadEntry<T> = {
        _poll() {
          head.dirty = true
          hooks.callHook('entries:updated', head)
        },
        dispose() {
          if (entries.delete(_i)) {
            _._poll()
          }
        },
        // a patch is the same as creating a new entry, just a nice DX
        patch(input) {
          if (filterMode(options.mode, ssr)) {
            entries.set(_i, {
              _i,
              input,
              options,
            })
            _._poll()
          }
        },
      }
      _.patch(input)
      return _
    },
    async resolveTags() {
      const ctx: { tagMap: Map<string, HeadTag>, tags: HeadTag[], entries: HeadEntry<T>[] } = {
        tagMap: new Map(),
        tags: [],
        entries: [...head.entries.values()],
      }
      await hooks.callHook('entries:resolve', ctx)
      const allTags = []
      let hasFlatMeta = false
      for (const e of ctx.entries) {
        if (!e._tags) {
          const normalizeCtx = { tags: normalizeEntryToTags(e.input, resolvedOptions.propResolvers), entry: e }
          await hooks.callHook('entries:normalize', normalizeCtx)
          e._tags = normalizeCtx.tags.map((t, i) => {
            t._w = tagWeight(head, t)
            t._p = (e._i << 10) + i
            t._d = tagDedupeKey(t) // || hashTag(t)
            return Object.assign(t, e.options)
          })
        }
        allTags.push(...e._tags)
      }
      allTags
        .sort(sortTags)
        // convert into map of <_d, t>
        .reduce((acc, next) => {
          const k = String(next._d || next._p)
          if (!acc.has(k))
            return acc.set(k, next)

          const prev = acc.get(k)!
          const strategy = next?.tagDuplicateStrategy || (UsesMergeStrategy.has(next.tag) ? 'merge' : null)
            || (next.key && next.key === prev.key ? 'merge' : null)

          if (strategy === 'merge') {
            const newProps = { ...prev.props }
            Object.entries(next.props).forEach(([p, v]) =>
              // @ts-expect-error untyped
              newProps[p] = p === 'style'
                // @ts-expect-error untyped
                ? new Map([...(prev.props.style || new Map()), ...v])
                : p === 'class' ? new Set([...(prev.props.class || new Set()), ...v]) : v)
            acc.set(k, { ...next, props: newProps })
          }
          else if ((next._p! >> 10) === (prev._p! >> 10) && isMetaArrayDupeKey(next._d!)) {
            acc.set(k, Object.assign([...(Array.isArray(prev) ? prev : [prev]), next], next))
            hasFlatMeta = true
          }
          // @ts-expect-error untyped
          else if (next._w === prev._w ? next._p! > prev._p! : next?._w < prev?._w) {
            acc.set(k, next)
          }
          return acc
        }, ctx.tagMap)

      const title = ctx.tagMap.get('title')
      const titleTemplate = ctx.tagMap.get('titleTemplate')?.textContent
      head._title = title?.textContent
      head._titleTemplate = typeof titleTemplate === 'string' ? titleTemplate : undefined

      if (titleTemplate && title) {
        // @ts-expect-error todo
        let newTitle = typeof titleTemplate === 'function' ? titleTemplate(title.textContent) : titleTemplate
        if (typeof newTitle === 'string' && !head.plugins.has('template-params')) {
          newTitle = newTitle.replace('%s', title.textContent || '')
        }
        newTitle === null ? ctx.tagMap.delete('title') : ctx.tagMap.set('title', { ...title, textContent: newTitle })
      }
      // merge _tags into one map
      ctx.tags = Array.from(ctx.tagMap!.values())
      if (hasFlatMeta) {
        ctx.tags = ctx.tags.flat().sort(sortTags)
      }

      await hooks.callHook('tags:beforeResolve', ctx)
      await hooks.callHook('tags:resolve', ctx)
      // post-processing mainly for XSS prevention
      await hooks.callHook('tags:afterResolve', ctx)
      // final logic - XSS and remove any invalid tags
      ctx.tags = ctx.tags.map((tag) => {
        if (!ValidHeadTags.has(tag.tag)) {
          return false
        }
        // avoid rendering empty tags
        if (Object.keys(tag.props).length === 0 && !tag.innerHTML && !tag.textContent) {
          return false
        }
        // quick check for invalid meta tags
        if (tag.tag === 'meta' && !tag.props.content && !tag.props['http-equiv'] && !tag.props.charset) {
          return false
        }
        if (tag.tag === 'script' && tag.innerHTML) {
          if (tag.props.type?.endsWith('json')) {
            const v = typeof tag.innerHTML === 'string' ? tag.innerHTML : JSON.stringify(tag.innerHTML)
            // ensure </script> tags get encoded, this is only for JSON, it will break HTML if used
            tag.innerHTML = v.replace(/</g, '\\u003C')
          }
          else if (typeof tag.innerHTML === 'string') {
            // make sure the tag isn't being ended
            tag.innerHTML = tag.innerHTML.replace(new RegExp(`</${tag.tag}`, 'g'), `<\\/${tag.tag}`)
          }
        }
        return tag
      })
        .filter(Boolean) as HeadTag[]

      // ctx.tags = ctx.tags
      // // filter out invalid tags (no props
      //   .filter()
      //   .filter(Boolean)

      return ctx.tags
    },
  }
  registerPlugins(head, resolvedOptions?.plugins || [], ssr)
  head.hooks.callHook('init', head)
  if (Array.isArray(resolvedOptions.init)) {
    resolvedOptions.init
      .forEach(e => e && head.push(e as T))
  }
  return head
}
