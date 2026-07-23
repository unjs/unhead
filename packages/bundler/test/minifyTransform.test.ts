import type { MinifyFn } from '../src/unplugin/MinifyTransform'
import { describe, expect, it } from 'vitest'
import { MinifyTransform } from '../src/unplugin/MinifyTransform'

const mockJSMinifier: MinifyFn = async (code: string) => {
  // simple mock: strip comments and collapse whitespace
  return code.replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim()
}

const mockCSSMinifier: MinifyFn = async (code: string) => {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim()
}

async function transform(code: string | string[], opts: { js?: false | MinifyFn, css?: false | MinifyFn } = {}, id = '/app/some-id.js') {
  const plugin = MinifyTransform.vite(opts) as any
  const res = await transformWithPlugin(plugin, code, id)
  return res?.code
}

async function transformWithPlugin(plugin: any, code: string | string[], id = '/app/some-id.js') {
  if (plugin.transformInclude && !plugin.transformInclude(id))
    return undefined
  const handler = typeof plugin.transform === 'function' ? plugin.transform : plugin.transform.handler
  return handler.call(
    {},
    Array.isArray(code) ? code.join('\n') : code,
    id,
  )
}

describe('minifyTransform', () => {
  it('minifies inline script innerHTML with provided js minifier', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ innerHTML: '// comment\\nvar x = 1;  var y = 2;' }]`,
      `})`,
    ], { js: mockJSMinifier })

    expect(code).toBeDefined()
    expect(code).not.toContain('// comment')
    expect(code).toContain('var x = 1; var y = 2;')
  })

  it('minifies inline style innerHTML with provided css minifier', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  style: [{ innerHTML: '/* comment */ body { margin: 0; }' }]`,
      `})`,
    ], { css: mockCSSMinifier })

    expect(code).toBeDefined()
    expect(code).not.toContain('/* comment */')
  })

  it('skips JS minification when no js minifier is provided', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ innerHTML: '// comment here plus some extra padding for length' }]`,
      `})`,
    ], {})

    expect(code).toBeUndefined()
  })

  it('skips CSS minification when no css minifier is provided', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  style: [{ innerHTML: '/* comment */ body { margin: 0; }' }]`,
      `})`,
    ], {})

    expect(code).toBeUndefined()
  })

  it('respects js: false option', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ innerHTML: '// comment\\nvar x = 1;  var y = 2;' }]`,
      `})`,
    ], { js: false })

    expect(code).toBeUndefined()
  })

  it('respects css: false option', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  style: [{ innerHTML: '/* comment */ body { margin: 0; }' }]`,
      `})`,
    ], { css: false })

    expect(code).toBeUndefined()
  })

  it.each([
    ['application/ld+json', '{ "name":  "test",  "value":   123 }', '{"name":"test","value":123}'],
    ['speculationrules', '{ "prerender":  [{ "where": {} }] }', '{"prerender":[{"where":{}}]}'],
    ['importmap', '{ "imports":  { "lodash":  "/lodash.js" } }', '{"imports":{"lodash":"/lodash.js"}}'],
  ])('minifies %s scripts as JSON', async (type, input, output) => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ type: '${type}', innerHTML: '${input}' }]`,
      `})`,
    ], { js: mockJSMinifier })

    expect(code).toBeDefined()
    expect(code).toContain(JSON.stringify(output))
    expect(code).not.toContain(input)
  })

  it('leaves invalid declarative JSON untouched', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ type: 'speculationrules', innerHTML: '{ invalid:  JSON with padding }' }]`,
      `})`,
    ], { js: mockJSMinifier })

    expect(code).toBeUndefined()
  })

  it('minifies declarative JSON with a quoted type key when JS minification is disabled', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ 'type': 'speculationrules', innerHTML: '{ "prefetch":  [{ "urls": [] }] }' }]`,
      `})`,
    ], { js: false })

    expect(code).toBeDefined()
    expect(code).toContain(JSON.stringify('{"prefetch":[{"urls":[]}]}'))
  })

  it('preserves encoded closing tags in declarative JSON', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ type: 'importmap', innerHTML: '{ "imports": { "x": "\\\\u003C/script>" } }' }]`,
      `})`,
    ], { js: mockJSMinifier })

    expect(code).toBeDefined()
    expect(code).toContain('\\\\u003C/script>')
    expect(code).not.toContain('<\/script>')
  })

  it('skips short strings below default threshold', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ innerHTML: 'var x = 1' }]`,
      `})`,
    ], { js: mockJSMinifier })

    expect(code).toBeUndefined()
  })

  it('handles useServerHead calls', async () => {
    const code = await transform([
      `import { useServerHead } from 'unhead'`,
      `useServerHead({`,
      `  script: [{ innerHTML: '// comment\\nvar x = 1;  var y = 2;' }]`,
      `})`,
    ], { js: mockJSMinifier })

    expect(code).toBeDefined()
    expect(code).not.toContain('// comment')
  })

  it('handles aliased imports', async () => {
    const code = await transform([
      `import { useHead as head } from 'unhead'`,
      `head({`,
      `  script: [{ innerHTML: '// comment\\nvar x = 1;  var y = 2;' }]`,
      `})`,
    ], { js: mockJSMinifier })

    expect(code).toBeDefined()
    expect(code).not.toContain('// comment')
  })

  it('handles namespace imports', async () => {
    const code = await transform([
      `import * as head from 'unhead'`,
      `head.useHead({`,
      `  script: [{ innerHTML: '// comment\\nvar x = 1;  var y = 2;' }]`,
      `})`,
    ], { js: mockJSMinifier })

    expect(code).toBeDefined()
    expect(code).not.toContain('// comment')
  })

  it('does not transform shadowed aliases or namespace imports', async () => {
    const code = await transform([
      `import { useHead as head } from 'unhead'`,
      `import * as unhead from 'unhead'`,
      `function setup(head, unhead) {`,
      `  head({ script: [{ innerHTML: '// comment\\nvar x = 1;  var y = 2;' }] })`,
      `  unhead.useHead({ style: [{ innerHTML: '/* comment */ body { margin: 0; }' }] })`,
      `}`,
    ], { js: mockJSMinifier, css: mockCSSMinifier })

    expect(code).toBeUndefined()
  })

  it('handles single object (non-array) script/style', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: { innerHTML: '// comment\\nvar x = 1;  var y = 2;' }`,
      `})`,
    ], { js: mockJSMinifier })

    expect(code).toBeDefined()
    expect(code).not.toContain('// comment')
  })

  it('ignores node_modules', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ innerHTML: '// comment\\nvar x = 1;  var y = 2;' }]`,
      `})`,
    ], { js: mockJSMinifier }, '/app/node_modules/some-lib/index.js')

    expect(code).toBeUndefined()
  })

  it('ignores non-JS files', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ innerHTML: '// comment\\nvar x = 1;  var y = 2;' }]`,
      `})`,
    ], { js: mockJSMinifier }, '/app/test.css')

    expect(code).toBeUndefined()
  })

  it('handles template literal without expressions', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      'useHead({',
      '  script: [{ innerHTML: `// comment\nvar x = 1;  var y = 2;` }]',
      '})',
    ], { js: mockJSMinifier })

    expect(code).toBeDefined()
    expect(code).not.toContain('// comment')
  })

  it('handles comments between content property names and values', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ innerHTML /* retained syntax */ : '// comment\\nvar x = 1;  var y = 2;' }]`,
      `})`,
    ], { js: mockJSMinifier })

    expect(code).toBeDefined()
    expect(code).not.toContain('// comment')
  })

  it('handles escaped content property names', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ inner\\u0048TML: '// comment\\nvar x = 1;  var y = 2;' }]`,
      `})`,
    ], { js: mockJSMinifier })

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
    ], { js: mockJSMinifier, css: mockCSSMinifier })

    expect(code).toBeDefined()
    expect(code).not.toContain('// comment')
    expect(code).not.toContain('/* comment */')
  })

  it('deduplicates identical minifications across concurrent transforms', async () => {
    let calls = 0
    const minifier: MinifyFn = async (code) => {
      calls++
      await Promise.resolve()
      return code.replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim()
    }
    const plugin = MinifyTransform.vite({ js: minifier }) as any
    const source = [
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ innerHTML: '// comment\\nvar x = 1;  var y = 2;' }]`,
      `})`,
    ]

    const results = await Promise.all([
      transformWithPlugin(plugin, source, '/app/one.ts'),
      transformWithPlugin(plugin, source, '/app/two.ts'),
    ])

    expect(calls).toBe(1)
    expect(results.every(result => result?.code.includes('var x = 1; var y = 2;'))).toBe(true)
  })

  it('preserves source content in generated sourcemaps', async () => {
    const source = [
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  style: [{ innerHTML: '/* comment */ body { margin: 0; }' }]`,
      `})`,
    ].join('\n')
    const plugin = MinifyTransform.vite({ css: mockCSSMinifier }) as any
    const result = await transformWithPlugin(plugin, source, '/app/source-map.ts')

    expect(result?.map).toBeDefined()
    expect(result.map.sources).toEqual(['/app/source-map.ts'])
    expect(result.map.sourcesContent).toEqual([source])
  })

  it('transforms vue script blocks', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ innerHTML: '// comment\\nvar x = 1;  var y = 2;' }]`,
      `})`,
    ], { js: mockJSMinifier }, '/app/test.vue?type=script')

    expect(code).toBeDefined()
  })

  it('does not transform vue template blocks', async () => {
    const code = await transform([
      `import { useHead } from 'unhead'`,
      `useHead({`,
      `  script: [{ innerHTML: '// comment\\nvar x = 1;  var y = 2;' }]`,
      `})`,
    ], { js: mockJSMinifier }, '/app/test.vue?type=template')

    expect(code).toBeUndefined()
  })
})
