import type { TreeshakeServerComposablesOptions } from './createTransformPipeline'
import { createUnplugin } from 'unplugin'
import { createTransformPipeline } from './createTransformPipeline'

export type { TreeshakeServerComposablesOptions }

/**
 * Removes statement-level `useServerHead()` / `useServerSeoMeta()` /
 * `useSchemaOrg()` calls from client builds. Thin single-concern adapter over
 * the shared transform pipeline; `Unhead()` / `createFrameworkPlugin()`
 * compose the same concern into a single-parse pipeline instead.
 */
export const TreeshakeServerComposables = createUnplugin<TreeshakeServerComposablesOptions, false>((options: TreeshakeServerComposablesOptions = {}) =>
  createTransformPipeline({
    name: 'unhead:remove-server-composables',
    treeshake: options,
    seoMeta: false,
    minify: false,
  }))
