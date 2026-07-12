import type { HeadPluginInput } from '../types/head'
import type { ResolvableHead } from '../types/schema'

export function defineHeadPlugin<
  Input = ResolvableHead,
  RenderResult = unknown,
  const Plugin extends HeadPluginInput<Input, RenderResult> = HeadPluginInput<Input, RenderResult>,
>(plugin: Plugin): Plugin
export function defineHeadPlugin<
  Input = ResolvableHead,
  RenderResult = unknown,
  const Plugin extends HeadPluginInput<Input, RenderResult> = HeadPluginInput<Input, RenderResult>,
  const Key extends string = string,
>(plugin: Plugin, key: Key): Plugin & { key: Key }
export function defineHeadPlugin<const Plugin>(plugin: Plugin, key?: string): Plugin {
  // expose the key statically so registerPlugin can dedupe a function plugin
  // before invoking its (potentially side-effecting) setup
  if (key && typeof plugin === 'function')
    Object.assign(plugin, { key })
  return plugin
}
