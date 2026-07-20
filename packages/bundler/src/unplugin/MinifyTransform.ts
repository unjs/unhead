import type { MinifyFn, MinifyTransformOptions } from './createTransformPipeline'
import { createUnplugin } from 'unplugin'
import { createTransformPipeline } from './createTransformPipeline'

export type { MinifyFn, MinifyTransformOptions }

/**
 * Vite/Webpack transform plugin that pre-minifies static string literals
 * inside `useHead()` / `useServerHead()` calls at build time.
 *
 * Uses esbuild (Vite 7) or rolldown (Vite 8+) for JS, and lightningcss for CSS.
 * These never enter the SSR runtime bundle since they run only in the Vite `transform` hook.
 *
 * Thin single-concern adapter over the shared transform pipeline; `Unhead()` /
 * `createFrameworkPlugin()` compose the same concern into a single-parse
 * pipeline instead.
 */
export const MinifyTransform = createUnplugin<MinifyTransformOptions, false>((options: MinifyTransformOptions = {}) =>
  createTransformPipeline({
    name: 'unhead:minify-transform',
    treeshake: false,
    seoMeta: false,
    minify: options,
  }))
