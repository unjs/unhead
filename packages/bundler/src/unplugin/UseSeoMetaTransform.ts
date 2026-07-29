import type { UseSeoMetaTransformOptions } from './createTransformPipeline'
import { createUnplugin } from 'unplugin'
import { createTransformPipeline } from './createTransformPipeline'

export type { UseSeoMetaTransformOptions }

/**
 * useSeoMeta({
 *   title: 'My Title',
 *   titleTemplate: '%s | My Site',
 *   description: 'My Description',
 * })
 * ->
 * useHead({
 *  title: 'My Title',
 *  titleTemplate: '%s | My Site',
 *  meta: [
 *    { name: 'description', content: 'My Description' },
 *  ],
 * })
 *
 * Thin single-concern adapter over the shared transform pipeline; `Unhead()` /
 * `createFrameworkPlugin()` compose the same concern into a single-parse
 * pipeline instead.
 */
export const UseSeoMetaTransform = createUnplugin<UseSeoMetaTransformOptions, false>((options: UseSeoMetaTransformOptions = {}) =>
  createTransformPipeline({
    name: 'unhead:use-seo-meta-transform',
    treeshake: false,
    seoMeta: options,
    minify: false,
  }))
