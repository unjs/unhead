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
} from '@unhead/schema'
import { normaliseEntryTags } from '@unhead/shared'
import { createHooks } from 'hookable'
import DedupePlugin from './plugins/dedupe'
import SortPlugin from './plugins/sort'
import TemplateParamsPlugin from './plugins/templateParams'
import TitleTemplatePlugin from './plugins/titleTemplate'
import XSSPlugin from './plugins/xss'

function filterMode(mode: RuntimeMode | undefined, ssr: boolean) {
  return !mode || (mode === 'server' && ssr) || (mode === 'client' && !ssr)
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
    headEntries() {
      return entries
    },
    use(p: HeadPluginInput) {
      // @ts-expect-error untyped
      const plugin = (typeof p === 'function' ? p(head) : p)
      // dedupe based on the plugin key
      if (!plugin.key || !plugins.some(p => p.key === plugin.key)) {
        plugins.push(plugin)
        filterMode(plugin.mode, ssr) && hooks.addHooks(plugin.hooks || {})
      }
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
    ssr,
  }
  ;[
    DedupePlugin,
    SortPlugin,
    TemplateParamsPlugin,
    TitleTemplatePlugin,
    XSSPlugin,
    ...(options?.plugins || []),
  ].forEach(p => head.use(p))
  head.hooks.callHook('init', head)
  return head
}
