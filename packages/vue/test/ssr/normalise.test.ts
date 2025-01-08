import { renderSSRHead } from '@unhead/ssr'
import { createHead } from '@unhead/vue/server'
import { describe, expect, it } from 'vitest'

describe('normalise', () => {
  it('handles booleans nicely', async () => {
    const head = createHead()

    const fn = () => {}
    fn.toString = () => {
      return 'stringified function'
    }
    head.push({
      link: [
        {
          'array': ['a', 1],
          'big-int': BigInt(1),
          'big': 100n,
          'binary': 0b1010,
          'boolean-false': false,
          'boolean-true': true,
          'data-foo': 'true',
          'hex': 0xF00D,
          'null': null,
          'number': 1337,
          'object': { a: 1 },
          'octal': 0o744,
          'string-empty': '',
          'string': 'string',
          'symbol': Symbol('a'),
          'regex': /a/,
          'function': fn,
          undefined,
        },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx.headTags.split('" ')).toMatchInlineSnapshot(`
      [
        "<link array="a,1",
        "big-int="1",
        "big="100",
        "binary="10",
        "boolean-true data-foo="true",
        "hex="61453",
        "number="1337",
        "object="[object Object]",
        "octal="484",
        "string-empty string="string",
        "symbol="Symbol(a)",
        "regex="/a/">",
      ]
    `)
  })
})
