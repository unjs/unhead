import { describe, expect, it } from 'vitest'
import type { MinifyFn } from '../src/unplugin/MinifyTransform'
import { MinifyTransform } from '../src/unplugin/MinifyTransform'

const mockJSMinifier: MinifyFn = async (code: string) => {
  // simple mock: strip comments and collapse whitespace
  return code.replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim()
}

const mockCSSMinifier: MinifyFn = async (code: string) => {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim()
}

async function transform(code: string | string[], opts: { jsMinifier?: MinifyFn, cssMinifier?: MinifyFn, js?: boolean, css?: boolean } = {}, id = '/app/some-id.js') {
  const plugin = MinifyTransform.vite(opts) as any
  if (plugin.transformInclude && !plugin.transformInclude(id))
    return undefined
  const res = await plugin.transform.call(
    {},
    Array.isArray(code) ? code.join('\n') : code,
    id,
  )
  return res?.code
}

describe('minifyTransform', () => {
  it('minifies inline script innerHTML with provided jsMinifier', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ innerHTML: '// comment\\nvar x = 1;  var y = 2;' }]`,
      `})`,
    ], { jsMinifier: mockJSMinifier })

    expect(code).toBeDefined()
    expect(code).not.toContain('// comment')
    expect(code).toContain('var x = 1; var y = 2;')
  })

  it('minifies inline style innerHTML with provided cssMinifier', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  style: [{ innerHTML: '/* comment */ body { margin: 0; }' }]`,
      `})`,
    ], { cssMinifier: mockCSSMinifier })

    expect(code).toBeDefined()
    expect(code).not.toContain('/* comment */')
  })

  it('skips JS minification when no jsMinifier is provided', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ innerHTML: '// comment here plus some extra padding for length' }]`,
      `})`,
    ], {})

    expect(code).toBeUndefined()
  })

  it('skips CSS minification when no cssMinifier is provided', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  style: [{ innerHTML: '/* comment */ body { margin: 0; }' }]`,
      `})`,
    ], {})

    expect(code).toBeUndefined()
  })

  it('respects js: false option even with jsMinifier provided', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ innerHTML: '// comment\\nvar x = 1;  var y = 2;' }]`,
      `})`,
    ], { jsMinifier: mockJSMinifier, js: false })

    expect(code).toBeUndefined()
  })

  it('respects css: false option even with cssMinifier provided', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  style: [{ innerHTML: '/* comment */ body { margin: 0; }' }]`,
      `})`,
    ], { cssMinifier: mockCSSMinifier, css: false })

    expect(code).toBeUndefined()
  })

  it('skips application/ld+json script types', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ type: 'application/ld+json', innerHTML: '{ "name":  "test",  "value":   123 }' }]`,
      `})`,
    ], { jsMinifier: mockJSMinifier })

    expect(code).toBeUndefined()
  })

  it('skips speculationrules script types', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ type: 'speculationrules', innerHTML: '{ "prerender":  [{ "where": {} }] }' }]`,
      `})`,
    ], { jsMinifier: mockJSMinifier })

    expect(code).toBeUndefined()
  })

  it('skips importmap script types', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ type: 'importmap', innerHTML: '{ "imports":  { "lodash":  "/lodash.js" } }' }]`,
      `})`,
    ], { jsMinifier: mockJSMinifier })

    expect(code).toBeUndefined()
  })

  it('skips short strings below default threshold', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ innerHTML: 'var x = 1' }]`,
      `})`,
    ], { jsMinifier: mockJSMinifier })

    expect(code).toBeUndefined()
  })

  it('handles useServerHead calls', async () => {
    const code = await transform([
      `import { useServerHead } from 'unhead'`,
      `useServerHead({`,
      `  script: [{ innerHTML: '// comment\\nvar x = 1;  var y = 2;' }]`,
      `})`,
    ], { jsMinifier: mockJSMinifier })

    expect(code).toBeDefined()
    expect(code).not.toContain('// comment')
  })

  it('handles single object (non-array) script/style', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: { innerHTML: '// comment\\nvar x = 1;  var y = 2;' }`,
      `})`,
    ], { jsMinifier: mockJSMinifier })

    expect(code).toBeDefined()
    expect(code).not.toContain('// comment')
  })

  it('ignores node_modules', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ innerHTML: '// comment\\nvar x = 1;  var y = 2;' }]`,
      `})`,
    ], { jsMinifier: mockJSMinifier }, '/app/node_modules/some-lib/index.js')

    expect(code).toBeUndefined()
  })

  it('ignores non-JS files', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ innerHTML: '// comment\\nvar x = 1;  var y = 2;' }]`,
      `})`,
    ], { jsMinifier: mockJSMinifier }, '/app/test.css')

    expect(code).toBeUndefined()
  })

  it('handles template literal without expressions', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      'useHead({',
      '  script: [{ innerHTML: `// comment\nvar x = 1;  var y = 2;` }]',
      '})',
    ], { jsMinifier: mockJSMinifier })

    expect(code).toBeDefined()
    expect(code).not.toContain('// comment')
  })

  it('handles both JS and CSS minification together', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ innerHTML: '// comment\\nvar x = 1;  var y = 2;' }],`,
      `  style: [{ innerHTML: '/* comment */ body { margin: 0; }' }]`,
      `})`,
    ], { jsMinifier: mockJSMinifier, cssMinifier: mockCSSMinifier })

    expect(code).toBeDefined()
    expect(code).not.toContain('// comment')
    expect(code).not.toContain('/* comment */')
  })

  it('transforms vue script blocks', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ innerHTML: '// comment\\nvar x = 1;  var y = 2;' }]`,
      `})`,
    ], { jsMinifier: mockJSMinifier }, '/app/test.vue?type=script')

    expect(code).toBeDefined()
  })

  it('does not transform vue template blocks', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ innerHTML: '// comment\\nvar x = 1;  var y = 2;' }]`,
      `})`,
    ], { jsMinifier: mockJSMinifier }, '/app/test.vue?type=template')

    expect(code).toBeUndefined()
  })
})
