import type { HeadPlugin, HeadPluginInput, HeadPluginOptions, Unhead } from '../types/head'

export function defineHeadPlugin(plugin: HeadPluginInput, key?: string): HeadPluginInput {
  // expose the key statically so registerPlugin can dedupe a function plugin
  // before invoking its (potentially side-effecting) setup
  if (key && typeof plugin === 'function')
    plugin.key = key
  return plugin
}

/**
 * Defines a plugin with a tag transform. It adds the `tags:afterResolve` hook that runs the
 * `transform` of the plugin on the full runtime. The compiled server head knows the hook by `_t`
 * and runs the transform itself. It lives here, not in `registerPlugin`, so a head without tag
 * transforms carries none of it.
 *
 * Each head gets its own copy of the plugin, so one definition serves every request.
 *
 * A `tags:afterResolve` listener that the plugin already has runs first. The hook then carries a
 * falsy `_t`, so the compiled server head renders that head on the full runtime.
 *
 * @experimental
 */
export function defineTagTransform<T extends HeadPlugin & Required<Pick<HeadPluginOptions, 'transform'>>>(plugin: T): ((head: Unhead<any, any>) => T) & { key: string } {
  const own: any = plugin.hooks?.['tags:afterResolve']
  return Object.assign((head: Unhead<any, any>): T => ({
    ...plugin,
    hooks: {
      ...plugin.hooks,
      'tags:afterResolve': Object.assign((ctx: any) => {
        own?.(ctx)
        ctx.tags = plugin.transform(ctx.tags, head)
      }, { _t: own ? 0 : 1 }),
    },
  }), { key: plugin.key })
}
