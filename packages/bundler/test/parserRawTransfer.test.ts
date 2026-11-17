import { createRequire } from 'node:module'
import { walk } from 'oxc-walker'
import { describe, expect, it } from 'vitest'
import { parseAndWalkSource } from '../src/unplugin/parser'

const require = createRequire(import.meta.url)
const oxc: { rawTransferSupported?: () => boolean } = require('oxc-parser')
const { parseSync: jsonParseSync } = require('rolldown/utils')

const rawTransferSupported = typeof oxc.rawTransferSupported === 'function' && oxc.rawTransferSupported()

function collectMembers(parseSync: (id: string, code: string, opts: any) => any, code: string): string[] {
  const seen: string[] = []
  const result = parseSync('x.js', code, { lang: 'js' })
  walk(result.program, {
    enter(node: any) {
      if (node.type === 'MemberExpression')
        seen.push(`${node.start}:${node.end}:${node.object?.name}.${node.property?.name}`)
    },
  })
  return seen
}

const CASES = [
  'if (head.ssr) { use(head.ssr) }',
  'head.ssr = false; delete head.ssr; head.ssr++;',
  'for (head.ssr in source) {} if (head.ssr) {} use(head.ssr)',
  'const s = "head.ssr"; /* head.ssr */ const re = /head\\.ssr/;',
  'head.ssr.value = 1; use(head.ssr);',
  // eslint-disable-next-line no-template-curly-in-string -- fixture is template syntax
  'const t = `${head.ssr}`;',
  'head.ssr && loader; !head.ssr; head.ssr ? a : b',
  'const x = { a: head.ssr }; const y = (head.ssr);',
]

describe.skipIf(!rawTransferSupported)('oxc-parser raw transfer', () => {
  it('walks the same member expressions as the JSON parse path', () => {
    for (const code of CASES) {
      const seen: string[] = []

      parseAndWalkSource(code, 'x.js', {
        parseOptions: { lang: 'js' },
        enter(node: any) {
          if (node.type === 'MemberExpression')
            seen.push(`${node.start}:${node.end}:${node.object?.name}.${node.property?.name}`)
        },
      })

      expect(seen).toEqual(collectMembers(jsonParseSync, code))
    }
  })
})
