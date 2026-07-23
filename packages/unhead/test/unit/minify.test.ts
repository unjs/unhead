import { fc, it as fcIt } from '@fast-check/vitest'
import { describe, expect, it } from 'vitest'
import { minifyCSS, minifyJS, minifyJSON } from '../../src/minify'

describe('minifyJS', () => {
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
})

describe('minifyCSS', () => {
  it('strips comments', () => {
    expect(minifyCSS('body { /* reset */ margin: 0 }')).not.toContain('reset')
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
