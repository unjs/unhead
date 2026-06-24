import type { UnpluginOptions } from 'unplugin'

export function withCodeFilter(plugin: UnpluginOptions, code: RegExp): UnpluginOptions {
  if (typeof plugin.transform !== 'function')
    return plugin

  return {
    ...plugin,
    transform: {
      filter: { code },
      handler: plugin.transform,
    },
  }
}
