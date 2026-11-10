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
 * @experimental
 */
export function withTagTransform<T extends HeadPlugin>(head: Unhead<any, any>, plugin: T): T {
  plugin.hooks = {
    ...plugin.hooks,
    'tags:afterResolve': Object.assign((ctx: { tags: any[] }) => {
      ctx.tags = plugin.transform!(ctx.tags, head)
    }, { _t: 1 }),
  }
  return plugin
}
