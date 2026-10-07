import type { BuildOptions } from 'vite'

export type MinifyFn = (code: string) => Promise<string | null>

export interface MinifyTransformOptions {
  sourcemap?: boolean
  filter?: {
    exclude?: RegExp[]
    include?: RegExp[]
  }
  /** Custom JS minifier, or `false` to disable JS minification. */
  js?: false | MinifyFn
  /** Custom CSS minifier, or `false` to disable CSS minification. */
  css?: false | MinifyFn
  /** Transpile inline JavaScript before optional minification. */
  transpile?: boolean | { target?: BuildOptions['target'] }
}
