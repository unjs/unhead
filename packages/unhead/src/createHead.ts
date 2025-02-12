import type {
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
import { normaliseEntryTags } from './utils'
import { createHooks } from 'hookable'
import { DedupePlugin, SortPlugin, TemplateParamsPlugin, TitleTemplatePlugin, XSSPlugin } from './plugins'

function filterMode(mode: RuntimeMode | undefined, ssr: boolean) {
  return !mode || (mode === 'server' && ssr) || (mode === 'client' && !ssr)
}

function registerPlugins(head: Unhead<any>, plugins: HeadPluginInput[], ssr: boolean) {
  plugins.forEach((p) => {
    const plugin = (typeof p === 'function' ? p(head) : p)
    if (!plugin.key || !head.plugins.some(existingPlugin => existingPlugin.key === plugin.key)) {
      head.plugins.push(plugin)
      if (filterMode(plugin.mode, ssr)) {
        head.hooks.addHooks(plugin.hooks || {})
      }
    }
  })
}

/**
 * Creates a core instance of unhead. Does not provide a global ctx for composables to work
 * and does not register DOM plugins.
 *
 * @param options
 */
export function createHeadCore<T extends Record<string, any> = Head>(options: CreateHeadOptions = {}) {
  // counter for keeping unique ids of head object entries
  const hooks = createHooks<HeadHooks>()
  hooks.addHooks(options.hooks || {})
  const ssr = !options.document
  const entries: Map<number, HeadEntry<T>> = new Map()
  const plugins: Map<string, HeadPlugin> = new Map()
  const head: Unhead<T> = {
    _entryCount: 1, // 0 is reserved for internal use
    plugins,
    dirty: false,
    resolvedOptions: options,
    hooks,
    ssr,
    entries,
    headEntries() {
      return [...entries.values()]
    },
    use(p: HeadPluginInput) {
      registerPlugins(head, [p], ssr)
    },
    push(input, _options) {
      const options = { ..._options } as Partial<HeadEntry<T>>
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
              ...options,
            })
            _._poll()
          }
        },
      }
      _.patch(input)
      return _
    },
    async resolveTags() {
      const resolveCtx: { tags: HeadTag[], entries: HeadEntry<T>[] } = { tags: [], entries: [...head.entries.values()] }
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
      // post-processing mainly for XSS prevention
      await hooks.callHook('tags:afterResolve', resolveCtx)
      return resolveCtx.tags
    },
  }
  registerPlugins(head, [
    DedupePlugin,
    SortPlugin,
    TemplateParamsPlugin,
    TitleTemplatePlugin,
    XSSPlugin,
    ...(options?.plugins || []),
  ], ssr)
  head.hooks.callHook('init', head)
  if (Array.isArray(options.init)) {
    options.init
      .filter(Boolean)
      .forEach(e => head.push(e as T, { tagPriority: 'low' }))
  }
  return head
}
