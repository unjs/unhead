import type { MinifyFn, MinifyTransformOptions } from './createTransformPipeline'
import type { InlineScriptTransformOptions } from './InlineScriptTransform'
import { createUnplugin } from 'unplugin'
import { createTransformPipeline } from './createTransformPipeline'
import { transformInlineScriptWithVite } from './InlineScriptTransform'

export type { InlineScriptTransformOptions, MinifyFn, MinifyTransformOptions }
export { transformInlineScriptWithVite }

interface MinifyTransformPluginOptions {
  minify?: MinifyTransformOptions | false
  transformInlineScripts?: InlineScriptTransformOptions | false
}

export function resolveMinifyTransformOptions(options: MinifyTransformPluginOptions): MinifyTransformOptions | undefined {
  const minifyOptions = options.minify !== false && typeof options.minify === 'object' ? options.minify : {}
  const transpile = options.transformInlineScripts === false
    ? false
    : typeof options.transformInlineScripts === 'object'
      ? options.transformInlineScripts
      : true

  if (!minifyOptions.js && !minifyOptions.css && !transpile)
    return

  return { ...minifyOptions, transpile }
}

/** Single-concern adapter over the shared transform pipeline. */
export const MinifyTransform = createUnplugin<MinifyTransformOptions, false>((options: MinifyTransformOptions = {}, meta) =>
  createTransformPipeline({
    name: 'unhead:minify-transform',
    framework: meta.framework,
    treeshake: false,
    seoMeta: false,
    minify: options,
  }))
