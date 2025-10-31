import { renderSSRHead } from '@unhead/ssr'
import { createHead } from '@unhead/vue/server'
import { ResolvableMeta } from 'unhead/types'
import { describe, expect, it } from 'vitest'

describe('normalise', () => {
  it('handles booleans nicely', async () => {
    const head = createHead({
      disableDefaults: true,
    })

    const fn = () => {}
    fn.toString = () => {
      return 'stringified function'
    }
    head.push({
      link: [
        {
          // @ts-expect-error untyped
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

  it('leaves string values untouched in meta content attribute', async () => {
    const head = createHead({
      disableDefaults: true,
    })

    head.push({
      meta: [
        {
          'name': 'test-meta',
          'content': 'true',
          'other-bool': 'true',
        } as ResolvableMeta,
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<meta name="test-meta" content="true" other-bool>",
        "htmlAttrs": "",
      }
    `)
  })
})
