import type { MinifyFn } from '../unplugin/MinifyTransform'
import { transform } from 'lightningcss'

export function createCSSMinifier(): MinifyFn {
  return async (code: string) => {
    const result = transform({
      filename: 'inline.css',
      code: new TextEncoder().encode(code),
      minify: true,
    })
    return new TextDecoder().decode(result.code).trim()
  }
}
