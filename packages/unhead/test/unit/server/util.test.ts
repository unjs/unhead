import { describe, expect, it } from 'vitest'
import { propsToString, tagToString } from '../../../src/server'

describe('propsToString', () => {
  it('prepends a space only when there are props', async () => {
    expect(propsToString({
      a: 'b',
    })).toStrictEqual(' a="b"')
    expect(propsToString({})).toStrictEqual('')
  })
  it('escapes ampersands in URL attributes', () => {
    expect(tagToString({
      tag: 'link',
      props: {
        rel: 'preload',
        as: 'image',
        href: '/_ipx/w_200&q_10/image.png',
        imagesrcset: '/_ipx/w_200&q_10/image.png 1x, /_ipx/w_400&q_10/image.png 2x',
      },
    })).toStrictEqual('<link rel="preload" as="image" href="/_ipx/w_200&amp;q_10/image.png" imagesrcset="/_ipx/w_200&amp;q_10/image.png 1x, /_ipx/w_400&amp;q_10/image.png 2x">')
  })
  it('escapes ampersands in metadata content', () => {
    expect(tagToString({
      tag: 'meta',
      props: {
        name: 'description',
        content: 'Research & Development',
      },
    })).toStrictEqual('<meta name="description" content="Research &amp; Development">')
    expect(tagToString({
      tag: 'meta',
      props: {
        name: 'description',
        content: 'a&copy;b',
      },
    })).toStrictEqual('<meta name="description" content="a&amp;copy;b">')
  })
  it('treats already encoded attributes as literal input', () => {
    expect(tagToString({
      tag: 'meta',
      props: {
        name: 'description',
        content: 'a&amp;b &quot;quoted&quot;',
      },
    })).toStrictEqual('<meta name="description" content="a&amp;amp;b &amp;quot;quoted&amp;quot;">')
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
