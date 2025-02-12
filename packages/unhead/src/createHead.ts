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
import { normaliseEntryTags } from '@unhead/shared'
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

  const updated = () => {
    // eslint-disable-next-line ts/no-use-before-define
    head.dirty = true
    // eslint-disable-next-line ts/no-use-before-define
    hooks.callHook('entries:updated', head)
  }
  let entryCount = 0
  let entries: HeadEntry<T>[] = []
  const plugins: HeadPlugin[] = []
  const head: Unhead<T> = {
    plugins,
    dirty: false,
    resolvedOptions: options,
    hooks,
    ssr,
    headEntries() {
      return entries
    },
    use(p: HeadPluginInput) {
      registerPlugins(head, [p], ssr)
    },
    push(input, entryOptions) {
      delete entryOptions?.head
      const entry: HeadEntry<T> = {
        _i: entryCount++,
        input,
        ...entryOptions as Partial<HeadEntry<T>>,
      }
      // bit hacky but safer
      if (filterMode(entry.mode, ssr)) {
        entries.push(entry)
        updated()
      }
      return {
        dispose() {
          entries = entries.filter(e => e._i !== entry._i)
          updated()
        },
        // a patch is the same as creating a new entry, just a nice DX
        patch(input) {
          for (const e of entries) {
            if (e._i === entry._i) {
              // bit hacky syncing
              e.input = entry.input = input
              e.resolvedInput = undefined
            }
          }
          updated()
        },
      }
    },
    async resolveTags() {
      const resolveCtx: { tags: HeadTag[], entries: HeadEntry<T>[] } = { tags: [], entries: [...entries] }
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
