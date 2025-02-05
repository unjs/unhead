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
} from '@unhead/schema'
import { normalizeEntryToTags } from '@unhead/shared'
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
 */
export function createHeadCore<T extends Record<string, any> = Head>(resolvedOptions: CreateHeadOptions = {}) {
  // counter for keeping unique ids of head object entries
  const hooks = createHooks<HeadHooks>()
  hooks.addHooks(resolvedOptions.hooks || {})
  const ssr = !resolvedOptions.document

  const entries: Map<number, HeadEntry<T>> = new Map()
  const plugins: HeadPlugin[] = []
  const head: Unhead<T> = {
    _entryCount: 0,
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
    push(input, options = {}) {
      const _i = head._entryCount++
      delete options?.head
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
              // @ts-expect-error untyped
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
      const resolveCtx: { tags: HeadTag[], entries: HeadEntry<T>[] } = { tags: [], entries: [...head.entries.values()] }
      await hooks.callHook('entries:resolve', resolveCtx)
      resolveCtx.tags = resolveCtx.entries.flatMap((e) => {
        // clone the entry to prevent mutation
        const transform = e.options?.transform || (e => e)
        // @ts-expect-error untyped
        e._tags = e._tags || normalizeEntryToTags(e._i, transform({ ...e.input }), e.options)
        return e._tags.map(t => ({ ...t, props: { ...t.props } }))
      })
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
    ...(resolvedOptions?.plugins || []),
  ], ssr)
  head.hooks.callHook('init', head)
  if (Array.isArray(resolvedOptions.init)) {
    resolvedOptions.init
      .filter(Boolean)
      .forEach(e => head.push(e as T, { tagPriority: 'low' }))
  }
  return head
}
