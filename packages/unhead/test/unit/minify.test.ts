import { compileFunction } from 'node:vm'
import { fc, it as fcIt } from '@fast-check/vitest'
import { describe, expect, it } from 'vitest'
import { minifyCSS, minifyJS, minifyJSON } from '../../src/minify'

describe('minifyJS', () => {
  it.each([
    ' ',
    '\t',
    '\v',
    '\f',
    '\n',
    '\r',
    '\u00A0',
    '\u1680',
    '\u2000',
    '\u2001',
    '\u2002',
    '\u2003',
    '\u2004',
    '\u2005',
    '\u2006',
    '\u2007',
    '\u2008',
    '\u2009',
    '\u200A',
    '\u2028',
    '\u2029',
    '\u202F',
    '\u205F',
    '\u3000',
    '\uFEFF',
  ])('preserves execution with whitespace: %j', (character) => {
    const input = `var${character}value${character}=${character}2; return value`
    expect(compileFunction(minifyJS(input))()).toBe(2)
  })

  it.each([
    ['var r = /[//]/; return r.test("/")', true],
    ['var r = /["\']/; return r.test("\'")', true],
    ['let ü = 1;  return ü', 1],
    ['var n = 1 .toString(); return n', '1'],
    ['let/* separator */value = 2; return value', 2],
    ['function f() { return/*\n*/1 }; return f()', undefined],
    ['function f() { return\r1 }; return f()', undefined],
    ['function f() { return\u20281 }; return f()', undefined],
    ['let x = 1; let y = 2; x\n++y; return [x, y]', [1, 3]],
    ['return 2 / /[//]/.source.length', 0.5],
    // eslint-disable-next-line no-template-curly-in-string -- Literal source for the minifier.
    ['return `outer ${`inner ${1 + 2}`} tail`', 'outer inner 3 tail'],
    ['let \\u00fc = 3; return ü', 3],
    ['let x = 2; return 1 < !--x', false],
  ])('preserves execution of %s', (input, expected) => {
    expect(compileFunction(minifyJS(input))()).toEqual(expected)
  })

  it.each([
    'if (ok) /[//]/.test(value);',
    'const r = /[\\/"\']/v;  consume(r);',
    // eslint-disable-next-line no-template-curly-in-string -- Literal source for the minifier.
    'const result = `a ${`b ${value}`} c`; ',
    'const value = left / right; ',
  ])('keeps uncertain syntax unchanged: %s', (input) => {
    expect(minifyJS(input)).toBe(input)
  })

  it('strips single-line comments', () => {
    const result = minifyJS('var x = 1 // comment\nvar y = 2')
    expect(result).toContain('var x=1')
    expect(result).not.toContain('comment')
  })

  it('strips multi-line comments', () => {
    expect(minifyJS('var x = 1 /* block\ncomment */ var y = 2')).not.toContain('block')
  })

  it('preserves string literals', () => {
    expect(minifyJS('var x = "hello // world"')).toContain('"hello // world"')
    expect(minifyJS('var x = \'hello /* world */\'')).toContain('\'hello /* world */\'')
  })

  it('preserves template literals', () => {
    expect(minifyJS('var x = `hello world`')).toContain('`hello world`')
  })

  it('collapses whitespace', () => {
    const result = minifyJS('var   x   =   1')
    expect(result).toBe('var x=1')
  })

  it('preserves space between + and - to avoid ++/-- operators', () => {
    const result = minifyJS('a + +b')
    expect(result).toContain('+ +')
  })

  it('preserves escaped quotes in strings', () => {
    expect(minifyJS('var x = "he\\"llo"')).toContain('"he\\"llo"')
  })

  it('handles real-world hydration payload', () => {
    const input = `
      // hydration
      window.__NUXT__ = {
        data: {},
        state: {
          count: 0
        }
      }
    `
    const result = minifyJS(input)
    expect(result).not.toContain('// hydration')
    expect(result).toContain('window.__NUXT__')
    expect(result.length).toBeLessThan(input.length)
  })

  it('returns compact input unchanged', () => {
    const input = 'globalThis.item={key:"value",count:1};'
    expect(minifyJS(input)).toBe(input)
  })
})

describe('minifyCSS', () => {
  it.each(['\uFEFF', '\u00A0', '\u000B', '\u2003'])('preserves non-CSS whitespace in tokens: %j', (character) => {
    expect(minifyCSS(`a { font-family: foo/**/${character}bar }`)).toBe(`a{font-family:foo/**/${character}bar}`)
    expect(minifyCSS(`a { font-family: foo${character}/**/bar }`)).toBe(`a{font-family:foo${character}/**/bar}`)
    expect(minifyCSS(`a { font-family: x${character}0.5 }`)).toBe(`a{font-family:x${character}0.5}`)
    expect(minifyCSS(`${character}a { color: red }`)).toBe(`${character}a{color:red}`)
    expect(minifyCSS(`a { color: red }${character}`)).toBe(`a{color:red}${character}`)
  })

  it.each([' ', '\t', '\n', '\f', '\r'])('collapses CSS whitespace: %j', (character) => {
    expect(minifyCSS(`${character}a${character}{${character}opacity:${character}0.5;${character}}${character}`)).toBe('a{opacity:.5}')
    expect(minifyCSS(`a { font-family: foo/**/${character}bar }`)).toBe('a{font-family:foo bar}')
  })

  it.each([
    ['@media screen and (max-width: 600px) { a { color: red } }', '@media screen and (max-width: 600px){a{color:red}}'],
    ['@supports not (display: grid) { a { b: c } }', '@supports not (display: grid){a{b:c}}'],
    ['div :first-child { color: red }', 'div :first-child{color:red}'],
    ['a { background: url(img/a-0.5x.png) }', 'a { background: url(img/a-0.5x.png) }'],
    ['a { background: URL(data:image/svg+xml,a-0.5) }', 'a { background: URL(data:image/svg+xml,a-0.5) }'],
    ['.a-0.5x { color: red }', '.a-0.5x{color:red}'],
    ['a { --tokens: 0.5x + 1; color: red }', 'a { --tokens: 0.5x + 1; color: red }'],
    [String.raw`a\:b :hover { color: red }`, String.raw`a\:b :hover { color: red }`],
    ['a/**/b { color: red }', 'a/**/b{color:red}'],
    ['@supports ((display: grid) and (color: red)) { a { color: red } }', '@supports ((display: grid) and (color: red)){a{color:red}}'],
    ['@supports selector(div * :hover) { a { color: red } }', '@supports selector(div * :hover){a{color:red}}'],
    [':is(a) :hover { color: red }', ':is(a) :hover{color:red}'],
  ])('preserves CSS tokens: %s', (input, expected) => {
    expect(minifyCSS(input)).toBe(expected)
  })

  it('strips comments', () => {
    expect(minifyCSS('body { /* reset */ margin: 0 }')).not.toContain('reset')
  })

  it.each(['/* comment */', '/* first */ /* second */'])('strips whitespace before trailing comments: %s', (comments) => {
    expect(minifyCSS(`color: red ${comments}`)).toBe('color:red')
    expect(minifyCSS(`font-family: foo\uFEFF ${comments}`)).toBe('font-family:foo\uFEFF')
  })

  it('collapses whitespace', () => {
    expect(minifyCSS('body  {  margin:  0  }')).toBe('body{margin:0}')
  })

  it('strips whitespace around CSS punctuation', () => {
    expect(minifyCSS('body { color: red }')).toBe('body{color:red}')
  })

  it('removes trailing semicolons before }', () => {
    expect(minifyCSS('body { margin: 0; }')).toBe('body{margin:0}')
  })

  it('preserves string literals', () => {
    expect(minifyCSS('body::after { content: "hello /* world */" }')).toContain('"hello /* world */"')
    expect(minifyCSS('body::after { content: \'hello "world"\' }')).toBe('body::after{content:\'hello "world"\'}')
  })

  it.each(['a { content: "unclosed ', 'a { color: red; /* unclosed'])('preserves incomplete CSS: %s', (input) => {
    expect(minifyCSS(input)).toBe(input)
  })

  it('preserves spaces in calc expressions where required', () => {
    const result = minifyCSS('width: calc(100% - 20px)')
    expect(result).toContain('100% - 20px')
  })

  it('strips leading zero from decimals', () => {
    expect(minifyCSS('opacity: 0.5')).toContain('.5')
  })

  it('does not strip zero from numbers like 10.5', () => {
    const result = minifyCSS('font-size: 10.5px')
    expect(result).toContain('10.5px')
  })

  it('strips space before !important', () => {
    expect(minifyCSS('color: red !important')).toContain('red!important')
  })

  it('handles real-world critical CSS', () => {
    const input = `
      /* Critical CSS */
      html, body {
        margin: 0;
        padding: 0;
        font-family: system-ui, sans-serif;
      }

      .container {
        max-width: 1200px;
        margin: 0 auto;
      }
    `
    const result = minifyCSS(input)
    expect(result).not.toContain('/* Critical CSS */')
    expect(result).toContain('html,body{')
    expect(result.length).toBeLessThan(input.length)
  })

  it('returns compact input unchanged', () => {
    const input = '.item{color:red;padding:1rem}'
    expect(minifyCSS(input)).toBe(input)
  })
})

describe('minifyJSON', () => {
  it('compacts pretty-printed JSON', () => {
    const input = JSON.stringify({ a: 1, b: [1, 2, 3] }, null, 2)
    expect(minifyJSON(input)).toBe('{"a":1,"b":[1,2,3]}')
  })

  it('returns compact JSON unchanged', () => {
    const input = '{"value":"spaces stay inside strings"}'
    expect(minifyJSON(input)).toBe(input)
  })

  it('returns invalid JSON unchanged', () => {
    expect(minifyJSON('not json')).toBe('not json')
  })

  it('preserves numeric tokens and encoded closing tags', () => {
    const input = '{\n  "id": 9007199254740993,\n  "close": "\\u003C/script>"\n}'
    expect(minifyJSON(input)).toBe('{"id":9007199254740993,"close":"\\u003C/script>"}')
  })

  it('preserves whitespace inside strings', () => {
    expect(minifyJSON('{ "value": "a  b\\tc" }')).toBe('{"value":"a  b\\tc"}')
  })

  fcIt.prop([fc.jsonValue()])('preserves arbitrary valid JSON', (value) => {
    const compact = JSON.stringify(value)
    const pretty = JSON.stringify(value, null, 2)
    expect(minifyJSON(compact)).toBe(compact)
    expect(minifyJSON(pretty)).toBe(compact)
  })

  fcIt.prop([fc.jsonValue()])('returns arbitrary invalid JSON unchanged', (value) => {
    const invalid = ` \n${JSON.stringify(value)} trailing`
    expect(minifyJSON(invalid)).toBe(invalid)
  })
})

// Measure performance in bench/minify.bench.ts. Unit tests assert output without clock noise.
describe.each([32_768, 262_144])('large input (%i bytes)', (size) => {
  it.each([
    ['JavaScript', minifyJS, 'var   item   =   { key: "value", count: 1 }; // comment\n', 'var item={key:"value",count:1};\n'],
    ['CSS', minifyCSS, '.item   { color: red; padding: calc(1rem + 2px); } /* comment */\n', '.item{color:red;padding:calc(1rem + 2px)}'],
  ] as const)('minifies %s without losing content', (_, minify, unit, expected) => {
    const repetitions = Math.ceil(size / unit.length)
    const input = unit.repeat(repetitions)

    expect(minify(input)).toBe(expected.repeat(repetitions).trimEnd())
  })
})
