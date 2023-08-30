import { describe, it } from 'vitest'
import { propsToString } from '@unhead/ssr'

describe('propsToString', () => {
  it('prepends a space only when there are props', async () => {
    expect(propsToString({
      a: 'b',
    })).toStrictEqual(' a="b"')
    expect(propsToString({})).toStrictEqual('')
  })

  it('stringifies all properties correctly', async () => {
    expect(propsToString({
      array: ['a', 1],
      big: 100n,
      bigInt: BigInt(1),
      binary: 0b1010,
      false: false,
      hex: 0xF00D,
      null: null,
      number: 1337,
      object: { a: 1 },
      octal: 0o744,
      string: 'string',
      stringEmpty: '',
      symbol: Symbol('a'),
      true: true,
      undefined,
    })).toStrictEqual(' array="a,1" big="100" bigInt="1" binary="10" hex="61453" number="1337" object="[object Object]" octal="484" string="string" stringEmpty symbol="Symbol(a)" true')
  })
})
