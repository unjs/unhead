import type { SerializableHead } from 'unhead/types'
import type { BaseTransformerTypes } from './types'
import MagicString from 'magic-string'
import { createUnplugin } from 'unplugin'
import { keyInlineTags } from '../inlineKeys'

const GENERATED_HEAD_RE = /^\s*\/\* @unhead-static-head \*\/\s*export default\s+/

export const GeneratedHeadTransform = createUnplugin<BaseTransformerTypes, false>(options => ({
  name: 'unhead:generated-head',
  vite: { apply: 'build' },
  transform: {
    filter: { code: GENERATED_HEAD_RE },
    handler(code, id) {
      const header = GENERATED_HEAD_RE.exec(code)
      if (!header || options.filter?.exclude?.some(pattern => id.match(pattern)))
        return

      const json = code.slice(header[0].length).trimEnd().replace(/;$/, '')
      const input: SerializableHead = JSON.parse(json)
      const output = new MagicString(code).overwrite(0, code.length, `export default ${JSON.stringify(keyInlineTags(input))}\n`)
      return { code: output.toString(), map: options.sourcemap === false ? null : output.generateMap({ includeContent: true, source: id }) }
    },
  },
}))
