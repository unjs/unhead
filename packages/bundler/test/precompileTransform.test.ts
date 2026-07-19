import { fc } from '@fast-check/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHead as createStaticHead, renderSSRHead as renderStaticHead } from '../../unhead/src/precompiled/server'
import { createHead, renderSSRHead } from '../../unhead/src/server'
import { unpackMeta } from '../../unhead/src/utils'
import { UnheadTransforms } from '../src/unplugin/createTransformPipeline'
import { Unhead } from '../src/unplugin/vite'

async function transform(code: string, options: any = {}, context: any = { environment: { config: { consumer: 'server' } } }) {
  const plugin = UnheadTransforms.vite({
    treeshake: false,
    seoMeta: {},
    precompile: {},
    minify: false,
    ...options,
  }) as any
  const result = await plugin.transform.handler.call(context, code, '/app/page.ts')
  return result?.code as string | undefined
}

function execute(code: string, names: string[] = ['useHead']) {
  const body = code.replace(/^import[^\n]*\n?/gm, '')
  const spies = Object.fromEntries(names.map(name => [name, vi.fn()]))
  // eslint-disable-next-line no-new-func -- transformed fixtures are local static source strings
  new Function(...names, 'head', body)(...names.map(name => spies[name]), {})
  return spies
}

function baseline(input: any) {
  const head = createHead({ disableDefaults: true })
  head.push(input)
  return renderSSRHead(head)
}

function compiled(plan: any) {
  const head = createStaticHead({ disableDefaults: true })
  head.push(plan)
  return renderStaticHead(head)
}

function strictCall(input: unknown, name = 'useHead') {
  return [
    `import { ${name} } from 'unhead/precompiled/server'`,
    `${name}(${JSON.stringify(input)}, { head })`,
  ].join('\n')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('sealed static precompile transform', () => {
  it('is wired through the public experimental option', async () => {
    const plugins = Unhead({
      devtools: false,
      experimental: { precompile: true },
      transformSeoMeta: false,
      treeshake: false,
      validate: false,
    }) as any[]
    const plugin = plugins.find(candidate => candidate.name === 'unhead:transforms')
    const result = await plugin.transform.handler.call({ environment: { config: { consumer: 'server' } } }, strictCall({ title: 'static' }), '/app/page.ts')
    expect(result.code).toContain('from \'unhead/precompiled/server\'')
    expect(result.code).toContain('const __unhead_precompiled_plan_0 = [[')
    expect(result.code).toContain('<title>static</title>')
  })

  it('leaves ordinary imports completely untouched', async () => {
    expect(await transform([
      'import { useHead } from \'unhead\'',
      'useHead({ title: \'ordinary\' })',
    ].join('\n'), { seoMeta: false })).toBeUndefined()
  })

  it('does not emit static plans in client-targeted modules', async () => {
    const code = strictCall({ title: 'client' })
    expect(await transform(code, { seoMeta: false }, { environment: { config: { consumer: 'client' } } })).toBeUndefined()
    expect(await transform(code, { seoMeta: false }, {})).toBeUndefined()
    expect(await transform(code, { seoMeta: false }, { environment: { config: { consumer: 'server' } } })).toContain('__unhead_precompiled_plan_0')
  })

  it.each(['use client', 'use server'])('keeps the %s directive first', async (directive) => {
    const code = await transform([
      `'${directive}';`,
      'import { useHead } from \'unhead/precompiled/server\'',
      'useHead({ title: \'static\' }, { head })',
    ].join('\n'))
    expect(code!.trimStart().startsWith(`'${directive}';`)).toBe(true)
    expect(code!.indexOf(`'${directive}';`)).toBeLessThan(code!.indexOf('__unhead_precompiled_plan_0'))
  })

  it('hoists build-finalized plans and renders without runtime tag objects', async () => {
    const code = await transform(strictCall({
      htmlAttrs: { 'lang': 'en-AU', 'data-theme': 'dark' },
      meta: [{ name: 'description', content: 'Static' }],
    }))
    const plan = execute(code!).useHead.mock.calls[0][0]
    expect(plan).toEqual(expect.arrayContaining([
      [100, 'htmlAttrs:lang', ' lang="en-AU"', 3],
      [100, 'htmlAttrs:data-theme', ' data-theme="dark"', 3],
      [100, 'meta:description', '<meta name="description" content="Static">'],
    ]))
    expect(compiled(plan)).toEqual(baseline({
      htmlAttrs: { 'lang': 'en-AU', 'data-theme': 'dark' },
      meta: [{ name: 'description', content: 'Static' }],
    }))
  })

  it('lowers static useSeoMeta directly into a rendered plan', async () => {
    const input = { title: 'SEO', description: 'Description', ogImage: { url: '/og.png', width: 1200 } }
    const code = await transform(strictCall(input, 'useSeoMeta'))
    const plan = execute(code!, ['useSeoMeta']).useSeoMeta.mock.calls[0][0]
    expect(compiled(plan)).toEqual(baseline({
      title: 'SEO',
      meta: [
        { property: 'og:image', content: '/og.png' },
        { property: 'og:image:width', content: 1200 },
        { name: 'description', content: 'Description' },
      ],
    }))
  })

  it.each([
    ['dynamic value', 'const value = getTitle()\nuseHead({ title: value }, { head })', /dynamic or unsupported value/],
    ['computed key', 'useHead({ [\'title\']: \'computed\' }, { head })', /dynamic or unsupported value/],
    ['spread', 'useHead({ ...{ title: \'spread\' } }, { head })', /dynamic or unsupported value/],
    ['getter', 'useHead({ get title() { return \'getter\' } }, { head })', /dynamic or unsupported value/],
    ['observed handle', 'const entry = useHead({ title: \'observed\' }, { head })', /return value cannot be observed/],
    ['entry options', 'useHead({ title: \'options\' }, { head, tagPriority: 1 })', /entry options are not supported/],
    ['template params', 'useHead({ templateParams: { site: \'x\' }, title: \'x\' }, { head })', /templateParams require runtime plugin processing/],
    ['title template', 'useHead({ title: \'Page\', titleTemplate: \'%s · Site\' }, { head })', /titleTemplate has cross-entry runtime semantics/],
    ['explicit key', 'useHead({ script: [{ key: \'app\', src: \'\/app.js\' }] }, { head })', /explicit tag keys/],
    ['attribute class', 'useHead({ htmlAttrs: { class: \'page\' } }, { head })', /class and style attributes/],
    ['invalid tag position', 'useHead({ script: [{ src: \'\/app.js\', tagPosition: \'invalid\' }] }, { head })', /tagPosition must be head, bodyOpen, or bodyClose/],
  ])('fails the build for %s', async (_name, call, error) => {
    await expect(transform([
      'import { useHead } from \'unhead/precompiled/server\'',
      call,
    ].join('\n'))).rejects.toThrow(error as RegExp)
  })

  it('rejects unsupported createHead options at build time', async () => {
    await expect(transform([
      'import { createHead } from \'unhead/precompiled/server\'',
      'const head = createHead({ plugins: [] })',
    ].join('\n'))).rejects.toThrow(/unsupported createHead option: plugins/)
  })

  it('rejects aliased strict composables and reports their source location', async () => {
    await expect(transform([
      'import { useHead } from \'unhead/precompiled/server\'',
      'const addHead = useHead',
      'addHead({ title: \'static\' }, { head })',
    ].join('\n'))).rejects.toThrow(/\/app\/page\.ts:2:17: strict precompile functions must be called directly/)
    await expect(transform([
      'import { useHead } from \'unhead/precompiled/server\'',
      'const title = getTitle()',
      'useHead({ title }, { head })',
    ].join('\n'))).rejects.toThrow(/\/app\/page\.ts:3:9: the head input contains a dynamic or unsupported value/)
  })

  it('allows namespace render/types while keeping strict functions direct', async () => {
    const code = await transform([
      'import * as uh from \'unhead/precompiled/server\'',
      'const head: uh.PrecompiledServerHead = uh.createHead()',
      'uh.useHead({ title: \'static\' }, { head })',
      'uh.renderSSRHead(head)',
    ].join('\n'))
    expect(code).toContain('const __unhead_precompiled_plan_0 = [[')
    expect(code).toContain('uh.useHead(__unhead_precompiled_plan_0, { head })')
    expect(code).toContain('uh.renderSSRHead(head)')
  })

  it('recognizes quoted import names and static computed namespace calls', async () => {
    const quoted = await transform([
      'import { "useHead" as addHead } from \'unhead/precompiled/server\'',
      'addHead({ title: \'quoted\' }, { head })',
    ].join('\n'))
    expect(quoted).toContain('addHead(__unhead_precompiled_plan_0, { head })')

    const computed = await transform([
      'import * as uh from \'unhead/precompiled/server\'',
      'uh[\'useHead\']({ title: \'computed\' }, { head })',
      'uh[\'renderSSRHead\'](head)',
    ].join('\n'))
    expect(computed).toContain('uh[\'useHead\'](__unhead_precompiled_plan_0, { head })')
    expect(computed).toContain('uh[\'renderSSRHead\'](head)')
  })

  it('rejects strict function re-exports but allows renderer and type re-exports', async () => {
    await expect(transform('export { useHead as addHead } from \'unhead/precompiled/server\''))
      .rejects
      .toThrow(/sealed createHead\/useHead\/useSeoMeta exports cannot be re-exported/)
    await expect(transform('export { "useHead" as addHead } from \'unhead/precompiled/server\''))
      .rejects
      .toThrow(/sealed createHead\/useHead\/useSeoMeta exports cannot be re-exported/)
    await expect(transform('export * from \'unhead/precompiled/server\''))
      .rejects
      .toThrow(/sealed createHead\/useHead\/useSeoMeta exports cannot be re-exported/)
    expect(await transform('export { renderSSRHead } from \'unhead/precompiled/server\'')).toBeUndefined()
    expect(await transform('export type { PrecompiledServerHead } from \'unhead/precompiled/server\'')).toBeUndefined()
    expect(await transform('import type { useHead } from \'unhead/precompiled/server\'; type HeadCall = typeof useHead')).toBeUndefined()
  })

  it('rejects dynamic and CommonJS access to the sealed entry', async () => {
    await expect(transform('const strict = import(\'unhead/precompiled/server\')'))
      .rejects
      .toThrow(/sealed server entry must use a static import/)
    await expect(transform('const strict = require(\'unhead/precompiled/server\')'))
      .rejects
      .toThrow(/sealed server entry must use a static ESM import/)
    await expect(transform('const strict = module.require(\'unhead/precompiled/server\')'))
      .rejects
      .toThrow(/sealed server entry must use a static ESM import/)
    await expect(transform('import strict = require(\'unhead/precompiled/server\')'))
      .rejects
      .toThrow(/sealed server entry must use a static ESM import/)
  })

  it('requires strict-entry provenance and respects local shadowing', async () => {
    expect(await transform([
      'import { useHead } from \'another-head-library\'',
      'useHead({ title: \'foreign\' })',
    ].join('\n'))).toBeUndefined()
    expect(await transform([
      'useHead({ title: \'local\' })',
      'function useHead(input) { return input }',
    ].join('\n'))).toBeUndefined()
  })

  it('keeps the independent seoMeta import rewrite for ordinary mode', async () => {
    const code = await transform([
      'import unheadDefault, { type ResolvableHead, useSeoMeta } from \'unhead\'',
      'useSeoMeta({ title: \'static\' })',
    ].join('\n'))
    expect(code).toContain('import unheadDefault, { type ResolvableHead, useHead } from \'unhead\'')
  })

  it('precompiles strict useSeoMeta independently of the ordinary seoMeta transform', async () => {
    const code = await transform(strictCall({ description: 'sealed' }, 'useSeoMeta'), { seoMeta: false })
    expect(code).toContain('__unhead_precompiled_plan_0')
    expect(execute(code!, ['useSeoMeta']).useSeoMeta.mock.calls[0][0]).toEqual([
      [100, 'meta:description', '<meta name="description" content="sealed">'],
    ])
  })

  it('subsumes configured content minification at build time', async () => {
    const js = vi.fn(async (value: string) => value.replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim())
    const code = await transform(
      strictCall({ script: [{ innerHTML: '// comment\nvar answer = 40 + 2;     console.log(answer);' }] }),
      { seoMeta: false, minify: { js } },
    )
    const plan = execute(code!).useHead.mock.calls[0][0]
    expect(js).toHaveBeenCalledTimes(1)
    expect(compiled(plan).headTags).toContain('var answer = 40 + 2; console.log(answer);')
  })

  it('skips JSON-like scripts during configured JS minification', async () => {
    const js = vi.fn(async (value: string) => value.trim())
    const content = '{  "name": "example",  "value": true  }'
    const code = await transform(strictCall({ script: [{ type: 'application/ld+json', innerHTML: content }] }), { seoMeta: false, minify: { js } })
    const plan = execute(code!).useHead.mock.calls[0][0]
    expect(compiled(plan).headTags).toContain(content)
    expect(js).not.toHaveBeenCalled()
  })

  it('matches ordinary SSR output across supported static fixtures', async () => {
    const fixtures = [
      { title: 'Title' },
      { title: 42 },
      { title: true },
      { htmlAttrs: { lang: 'en', dir: 'ltr' } },
      { meta: [{ charset: 'utf-8' }, { name: 'description', content: 'hello' }, { name: 'theme-color', content: ['red', 'blue'] }] },
      { link: [{ rel: 'canonical', href: '/canonical' }, { rel: 'stylesheet', href: '/style.css' }] },
      { script: [{ type: 'application/json', innerHTML: { value: '<unsafe>' } }], style: [{ textContent: 'body { color: red; }' }] },
      { script: [{ id: 'app', src: '/app.js' }] },
      { meta: [{ name: 'object-content', content: { nested: 'value' } }] },
    ]
    for (const input of fixtures) {
      const code = await transform(strictCall(input), { seoMeta: false })
      const plan = execute(code!).useHead.mock.calls[0][0]
      expect(compiled(plan)).toEqual(baseline(input))
    }
  })

  it('dedupes and orders across independently hoisted plans', async () => {
    const code = await transform([
      'import { useHead } from \'unhead/precompiled/server\'',
      'useHead({ meta: [{ name: \'description\', content: \'first\' }], link: [{ rel: \'stylesheet\', href: \'/style.css\' }] }, { head })',
      'useHead({ meta: [{ name: \'description\', content: \'last\' }], link: [{ rel: \'preconnect\', href: \'https://cdn.example.com\' }] }, { head })',
    ].join('\n'))
    const calls = execute(code!).useHead.mock.calls
    const head = createStaticHead({ disableDefaults: true })
    head.push(calls[0][0])
    head.push(calls[1][0])
    expect(renderStaticHead(head).headTags).toBe([
      '<link rel="preconnect" href="https://cdn.example.com">',
      '<link rel="stylesheet" href="/style.css">',
      '<meta name="description" content="last">',
    ].join('\n'))
  })

  it('keeps pre-sanitize identities for distinct script bodies', async () => {
    const first = { script: [{ innerHTML: '</script>' }] }
    const second = { script: [{ innerHTML: '<\\/script>' }] }
    const code = await transform([
      'import { useHead } from \'unhead/precompiled/server\'',
      `useHead(${JSON.stringify(first)}, { head })`,
      `useHead(${JSON.stringify(second)}, { head })`,
    ].join('\n'))
    const calls = execute(code!).useHead.mock.calls
    const sealed = createStaticHead({ disableDefaults: true })
    sealed.push(calls[0][0])
    sealed.push(calls[1][0])
    const normal = createHead({ disableDefaults: true })
    normal.push(first)
    normal.push(second)

    expect(renderStaticHead(sealed)).toEqual(renderSSRHead(normal))
    expect(renderStaticHead(sealed).headTags).toBe('<script><\\/script></script>\n<script><\\/script></script>')
  })

  it('replaces arrayable meta as one atomic cross-plan group', async () => {
    const first = { meta: [{ property: 'og:image', content: '/a.png' }, { property: 'og:image', content: '/b.png' }] }
    const second = { meta: [{ property: 'og:image', content: '/c.png' }] }
    const code = await transform([
      'import { useHead } from \'unhead/precompiled/server\'',
      `useHead(${JSON.stringify(first)}, { head })`,
      `useHead(${JSON.stringify(second)}, { head })`,
    ].join('\n'))
    const calls = execute(code!).useHead.mock.calls
    const sealed = createStaticHead({ disableDefaults: true })
    sealed.push(calls[0][0])
    sealed.push(calls[1][0])
    const normal = createHead({ disableDefaults: true })
    normal.push(first)
    normal.push(second)
    expect(renderStaticHead(sealed)).toEqual(renderSSRHead(normal))
    expect(renderStaticHead(sealed).headTags).toBe('<meta property="og:image" content="/c.png">')
    expect(typeof calls[1][0][0][2]).toBe('string')
  })

  it('orders scalar winners by their selected occurrence when an atomic group exists', async () => {
    const first = {
      meta: [
        { name: 'description', content: 'first' },
        { name: 'theme-color', content: 'red' },
        { name: 'theme-color', content: 'blue' },
      ],
    }
    const second = { meta: [{ name: 'description', content: 'last' }] }
    const code = await transform([
      'import { useHead } from \'unhead/precompiled/server\'',
      `useHead(${JSON.stringify(first)}, { head })`,
      `useHead(${JSON.stringify(second)}, { head })`,
    ].join('\n'))
    const calls = execute(code!).useHead.mock.calls
    const sealed = createStaticHead({ disableDefaults: true })
    sealed.push(calls[0][0])
    sealed.push(calls[1][0])
    const normal = createHead({ disableDefaults: true })
    normal.push(first)
    normal.push(second)

    expect(renderStaticHead(sealed)).toEqual(renderSSRHead(normal))
    expect(renderStaticHead(sealed).headTags).toBe([
      '<meta name="theme-color" content="red">',
      '<meta name="theme-color" content="blue">',
      '<meta name="description" content="last">',
    ].join('\n'))
  })

  it('does not reorder winners for an atomic group masked by higher priority', async () => {
    const first = {
      meta: [{ name: 'theme-color', content: 'winner', tagPriority: 10 }],
      title: 'first',
    }
    const second = {
      meta: [
        { property: 'og:image', content: '/x.png', tagPriority: 10 },
        { name: 'theme-color', content: 'masked-a', tagPriority: 50 },
        { name: 'theme-color', content: 'masked-b', tagPriority: 50 },
      ],
      title: 'last',
    }
    const code = await transform([
      'import { useHead } from \'unhead/precompiled/server\'',
      `useHead(${JSON.stringify(first)}, { head })`,
      `useHead(${JSON.stringify(second)}, { head })`,
    ].join('\n'))
    const calls = execute(code!).useHead.mock.calls
    const sealed = createStaticHead({ disableDefaults: true })
    sealed.push(calls[0][0])
    sealed.push(calls[1][0])
    const normal = createHead({ disableDefaults: true })
    normal.push(first)
    normal.push(second)

    expect(renderStaticHead(sealed)).toEqual(renderSSRHead(normal))
    expect(renderStaticHead(sealed).headTags).toBe([
      '<meta name="theme-color" content="winner">',
      '<title>last</title>',
      '<meta property="og:image" content="/x.png">',
    ].join('\n'))
  })

  it('rejects interleaved repeated arrayable identities', async () => {
    await expect(transform(strictCall({
      meta: [
        { property: 'og:image', content: '/a.png' },
        { property: 'og:image:width', content: 1200 },
        { property: 'og:image', content: '/b.png' },
      ],
    }))).rejects.toThrow(/repeated arrayable meta identities must be contiguous within one call/)
  })

  it('matches attribute merge ordering across defaults and priorities', async () => {
    const input = { htmlAttrs: { lang: 'fr', tagPriority: -20 } }
    const code = await transform(strictCall(input))
    const plan = execute(code!).useHead.mock.calls[0][0]
    const sealed = createStaticHead()
    sealed.push(plan)
    const normal = createHead()
    normal.push(input)
    expect(renderStaticHead(sealed)).toEqual(renderSSRHead(normal))
  })

  it('property: every supported generated head input is output-identical', async () => {
    const text = fc.string({ maxLength: 30 })
    const scalar = fc.oneof(text, fc.integer(), fc.boolean(), fc.constant(null))
    const inputArbitrary = fc.record({
      title: fc.option(text, { nil: undefined }),
      htmlAttrs: fc.option(fc.record({ lang: text, dir: text }), { nil: undefined }),
      meta: fc.array(fc.record({ name: text, content: scalar }), { maxLength: 4 }),
      link: fc.array(fc.record({ rel: fc.constantFrom('canonical', 'stylesheet', 'preload'), href: text }), { maxLength: 3 }),
      script: fc.array(fc.record({ type: fc.constantFrom('text/javascript', 'application/json'), innerHTML: text }), { maxLength: 2 }),
    })

    await fc.assert(fc.asyncProperty(inputArbitrary, async (input) => {
      const code = await transform(strictCall(input), { seoMeta: false })
      const plan = execute(code!).useHead.mock.calls[0][0]
      expect(compiled(plan)).toEqual(baseline(input))
    }), { numRuns: 100 })
  })

  it('property: supported static SEO input is output-identical', async () => {
    const text = fc.string({ maxLength: 30 })
    const seoInput = fc.record({
      title: fc.option(text, { nil: undefined }),
      description: fc.option(text, { nil: undefined }),
      robots: fc.option(fc.record({ noindex: fc.boolean(), nofollow: fc.boolean(), maxSnippet: fc.integer({ min: -1, max: 100 }) }), { nil: undefined }),
      ogImage: fc.option(fc.record({ url: text, width: fc.integer({ min: 1, max: 4096 }), height: fc.integer({ min: 1, max: 4096 }) }), { nil: undefined }),
      themeColor: fc.array(text, { maxLength: 3 }),
    })

    await fc.assert(fc.asyncProperty(seoInput, async (input) => {
      const staticInput = JSON.parse(JSON.stringify(input))
      const code = await transform(strictCall(staticInput, 'useSeoMeta'))
      const plan = execute(code!, ['useSeoMeta']).useSeoMeta.mock.calls[0][0]
      const { title, ...flatMeta } = staticInput
      expect(compiled(plan)).toEqual(baseline({
        ...(title === undefined ? {} : { title }),
        meta: unpackMeta(flatMeta as any),
      }))
    }), { numRuns: 100 })
  })
})
