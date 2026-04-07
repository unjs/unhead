import type { MinifyFn } from '../unplugin/MinifyTransform'
import { transform } from 'esbuild'

export function createJSMinifier(): MinifyFn {
  return async (code: string) => {
    const result = await transform(code, { minify: true, loader: 'js' })
    return result.code.trim()
  }
}
