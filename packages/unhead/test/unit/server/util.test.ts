import { describe, expect, it } from 'vitest'
import { propsToString } from '../../../src/server'
import { useDom } from '../../util'

describe('propsToString', () => {
  it.each(['unhead&colon;payload', '&#117;nhead:payload', '&quot;', 'a&b="c"'])('preserves the literal attribute value after HTML parsing: %s', (value) => {
    const dom = useDom({ headTags: `<meta${propsToString({ name: 'value', content: value })}>` })
    expect(dom.window.document.querySelector('meta')?.getAttribute('content')).toBe(value)
  })

  it('prepends a space only when there are props', async () => {
    expect(propsToString({
      a: 'b',
    })).toStrictEqual(' a="b"')
    expect(propsToString({})).toStrictEqual('')
  })
  it ('class / style strings', () => {
    expect(propsToString({
      class: 'a b',
      style: 'color: red; font-size: 12px',
    })).toStrictEqual(' class="a b" style="color: red; font-size: 12px"')
  })
  it('skips invalid own attribute names', () => {
    expect(propsToString({
      'name': 'description',
      '\'><script>alert(1)</script><meta data-x': 'x',
      'content': 'safe',
    })).toStrictEqual(' name="description" content="safe"')
  })
  it('stringifies all properties correctly', async () => {
    expect(propsToString({
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
      undefined,
    })).toStrictEqual(' array="a,1" big-int="1" big="100" binary="10" boolean-true data-foo="true" hex="61453" number="1337" object="[object Object]" octal="484" string-empty="" string="string" symbol="Symbol(a)" undefined="undefined"')
  })
})
