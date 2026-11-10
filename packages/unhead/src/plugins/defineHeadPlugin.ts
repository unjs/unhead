import type { HeadPlugin, HeadPluginInput, Unhead } from '../types/head'

export function defineHeadPlugin(plugin: HeadPluginInput, key?: string): HeadPluginInput {
  // expose the key statically so registerPlugin can dedupe a function plugin
  // before invoking its (potentially side-effecting) setup
  if (key && typeof plugin === 'function')
    plugin.key = key
  return plugin
}

/**
 * Adds the `tags:afterResolve` hook that runs the `transform` of a plugin on the full runtime.
 * The compiled server head knows the hook by `_t` and runs the transform itself. It lives here, not in
 * `registerPlugin`, so a head without tag transforms carries none of it.
 *
 * A `tags:afterResolve` listener that the plugin already has runs first. The hook then carries no
 * `_t`, so the compiled server head renders that head on the full runtime.
 *
 * @experimental
 */
export function withTagTransform<T extends HeadPlugin>(head: Unhead<any, any>, plugin: T): T {
  const own: any = plugin.hooks?.['tags:afterResolve']
  // a plugin that this function already changed keeps its hook
  if (!own?._t) {
    const hook = (ctx: any) => {
      own?.(ctx)
      ctx.tags = plugin.transform!(ctx.tags, head)
    }
    plugin.hooks = {
      ...plugin.hooks,
      'tags:afterResolve': own ? hook : Object.assign(hook, { _t: 1 }),
    }
  }
  return plugin
}
