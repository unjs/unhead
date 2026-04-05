import type { MinifyFn } from '../unplugin/MinifyTransform'
import { minify } from 'rolldown/experimental'

export function createJSMinifier(): MinifyFn {
  return async (code: string) => {
    const result = await minify('inline.js', code)
    return result.code.trim()
  }
}
