import type { UseSeoMetaTransformOptions } from './createTransformPipeline'
import { createUnplugin } from 'unplugin'
import { createTransformPipeline } from './createTransformPipeline'

export type { UseSeoMetaTransformOptions }

/** Single-concern adapter over the shared transform pipeline. */
export const UseSeoMetaTransform = createUnplugin<UseSeoMetaTransformOptions, false>((options: UseSeoMetaTransformOptions = {}, meta) =>
  createTransformPipeline({
    name: 'unhead:use-seo-meta-transform',
    framework: meta.framework,
    treeshake: false,
    seoMeta: options,
    minify: false,
  }))
