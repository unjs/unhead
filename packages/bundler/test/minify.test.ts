import { describe, expect, it } from 'vitest'
import { createJSMinifier as createEsbuildMinifier } from '../src/minify/esbuild'
import { createCSSMinifier } from '../src/minify/lightningcss'
import { createJSMinifier as createRolldownMinifier } from '../src/minify/rolldown'

describe('minify/rolldown', () => {
  const minify = createRolldownMinifier()

  it('minifies JS code', async () => {
    const result = await minify('const x = 1;\nconst y = 2;')
    expect(result).toBeDefined()
    expect(result!.length).toBeLessThan('const x = 1;\nconst y = 2;'.length)
  })

  it('strips comments', async () => {
    const result = await minify('// comment\nconst x = 1;')
    expect(result).not.toContain('// comment')
  })

  it('collapses whitespace', async () => {
    const result = await minify('const   x   =   1;')
    expect(result).not.toContain('   ')
  })
})

describe('minify/esbuild', () => {
  const minify = createEsbuildMinifier()

  it('minifies JS code', async () => {
    const result = await minify('const x = 1;\nconst y = 2;')
    expect(result).toBeDefined()
    expect(result!.length).toBeLessThan('const x = 1;\nconst y = 2;'.length)
  })

  it('strips comments', async () => {
    const result = await minify('// comment\nconst x = 1;')
    expect(result).not.toContain('// comment')
  })

  it('collapses whitespace', async () => {
    const result = await minify('const   x   =   1;')
    expect(result).not.toContain('   ')
  })
})

describe('minify/lightningcss', () => {
  const minify = createCSSMinifier()

  it('minifies CSS code', async () => {
    const input = 'body {\n  margin: 0;\n  padding: 0;\n}'
    const result = await minify(input)
    expect(result).toBeDefined()
    expect(result!.length).toBeLessThan(input.length)
  })

  it('strips comments', async () => {
    const result = await minify('/* comment */\nbody { margin: 0; }')
    expect(result).not.toContain('/* comment */')
  })

  it('collapses whitespace', async () => {
    const result = await minify('body  {  margin:  0  }')
    expect(result).not.toContain('  ')
  })
})
