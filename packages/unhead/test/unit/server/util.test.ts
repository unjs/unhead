import { describe, expect, it } from 'vitest'
import { propsToString } from '../../../src/server'

describe('propsToString', () => {
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
  it('skips enumerable inherited props', () => {
    const props = Object.create({ onload: 'alert(1)' })
    props.src = '/app.js'
    expect(propsToString(props)).toStrictEqual(' src="/app.js"')
  })
  it('escapes < and > in attribute values', () => {
    expect(propsToString({
      content: 'a<b>c',
    })).toStrictEqual(' content="a&lt;b&gt;c"')
  })
  it('still escapes quotes', () => {
    expect(propsToString({
      content: 'say "hi"',
    })).toStrictEqual(' content="say &quot;hi&quot;"')
  })
  it('preserves pre-escaped entities', () => {
    expect(propsToString({
      href: '/a?x=1&amp;y=2',
    })).toStrictEqual(' href="/a?x=1&amp;y=2"')
    expect(propsToString({
      content: 'a&#39;b&#x27;c&copy;',
    })).toStrictEqual(' content="a&#39;b&#x27;c&copy;"')
  })
  it('escapes ampersands that are not entity references', () => {
    expect(propsToString({
      href: '/search?q=a&b=2',
    })).toStrictEqual(' href="/search?q=a&amp;b=2"')
    expect(propsToString({
      href: '/_ipx/f_webp&s_4162x6018/header.jpg',
    })).toStrictEqual(' href="/_ipx/f_webp&amp;s_4162x6018/header.jpg"')
  })
  it('link hrefs round-trip to the same value a browser decodes', () => {
    // legacy no-semicolon sequences: browsers do not decode these, so they must not be preserved as entities
    expect(propsToString({
      href: '/search?a=1&lt=b&copy=1',
    })).toStrictEqual(' href="/search?a=1&amp;lt=b&amp;copy=1"')
    // unknown named reference with a semicolon: preserved raw, matches pre-change output
    expect(propsToString({
      href: '/search?a=1&foo;bar=2',
    })).toStrictEqual(' href="/search?a=1&foo;bar=2"')
    // numeric and named references pass through
    expect(propsToString({
      href: '/redirect?to=%2Fa&#38;from=%2Fb',
    })).toStrictEqual(' href="/redirect?to=%2Fa&#38;from=%2Fb"')
  })
  it('leaves clean values untouched', () => {
    expect(propsToString({
      href: '/images/header.webp',
    })).toStrictEqual(' href="/images/header.webp"')
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
