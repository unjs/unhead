import type { TreeshakeServerComposablesOptions } from './createTransformPipeline'
import { createUnplugin } from 'unplugin'
import { createTransformPipeline } from './createTransformPipeline'

export type { TreeshakeServerComposablesOptions }

/** Single-concern adapter over the shared transform pipeline. */
export const TreeshakeServerComposables = createUnplugin<TreeshakeServerComposablesOptions, false>((options: TreeshakeServerComposablesOptions = {}, meta) =>
  createTransformPipeline({
    name: 'unhead:remove-server-composables',
    framework: meta.framework,
    treeshake: options,
    seoMeta: false,
    minify: false,
  }))
