import type { HeadPluginInput } from '../types/head'

export function defineHeadPlugin(plugin: HeadPluginInput, key?: string): HeadPluginInput {
  // expose the key statically so registerPlugin can dedupe a function plugin
  // before invoking its (potentially side-effecting) setup
  if (key && typeof plugin === 'function')
    plugin.key = key
  return plugin
}
