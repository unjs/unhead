import { fc } from '@fast-check/vitest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { precompiledHeadInput } from '../../unhead/src/precompiled'
import { createHead, renderSSRHead } from '../../unhead/src/server'
import { resolveTags, unpackMeta } from '../../unhead/src/utils'
import { UnheadTransforms } from '../src/unplugin/createTransformPipeline'
import { Unhead } from '../src/unplugin/vite'

async function transform(code: string, options: any = {}, context: any = {}) {
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
  new Function(...names, '__unhead_precompiled', body)(...names.map(name => spies[name]), precompiledHeadInput)
  return spies
}

function render(input: any) {
  const head = createHead({ disableDefaults: true })
  head.push(input)
  return renderSSRHead(head)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('static precompile transform', () => {
  it('is wired through the public experimental option', async () => {
    const plugins = Unhead({
      devtools: false,
      experimental: { precompile: true },
      transformSeoMeta: false,
      treeshake: false,
      validate: false,
    }) as any[]
    const plugin = plugins.find(candidate => candidate.name === 'unhead:transforms')
    expect(plugin).toBeDefined()
    const result = await plugin.transform.handler.call({}, 'useHead({ title: \'static\' })', '/app/page.ts')
    expect(result.code).toContain('from \'virtual:unhead-precompiled-runtime\'')
    expect(result.code).toContain('useHead(__unhead_precompiled([')
    const resolveId = typeof plugin.resolveId === 'function' ? plugin.resolveId : plugin.resolveId.handler
    expect(resolveId('virtual:unhead-precompiled-runtime')).toMatch(/precompiled\.mjs$/)
  })

  it('does not ship the carrier in client-targeted modules', async () => {
    const code = 'useHead({ title: \'client\' })'
    expect(await transform(code, { seoMeta: false }, { environment: { config: { consumer: 'client' } } })).toBeUndefined()
    expect(await transform(code, { seoMeta: false }, { environment: { config: { consumer: 'server' } } })).toContain('__unhead_precompiled([')
  })

  it.each(['use client', 'use server'])('keeps the %s directive first', async (directive) => {
    const code = await transform([
      `'${directive}';`,
      'useHead({ title: \'static\' })',
    ].join('\n'))
    expect(code).toBeDefined()
    expect(code!.trimStart().startsWith(`'${directive}';`)).toBe(true)
    expect(code!.indexOf(`'${directive}';`)).toBeLessThan(code!.indexOf('from \'virtual:unhead-precompiled-runtime\''))
  })

  it('reuses the strict runtime entry for its carrier', async () => {
    const code = await transform([
      'import { useHead } from \'unhead/precompiled/server\'',
      'useHead({ title: \'strict\' }, { head })',
    ].join('\n'))
    expect(code).toContain('import { precompiledHeadInput as __unhead_precompiled } from \'unhead/precompiled/server\'')
  })

  it('precompiles normalized tags without build-specific weights or positions', async () => {
    const code = await transform([
      'import { useHead } from \'@unhead/vue\'',
      'useHead({',
      '  htmlAttrs: { CLASS: \'ignored-as-distinct\', class: [\'page\', \'dark\'], style: { color: \'red\', display: \'block\' } },',
      '  meta: [{ name: \'description\', content: \'Static\' }],',
      '})',
    ].join('\n'))
    expect(code).toBeDefined()
    const marker = execute(code!).useHead.mock.calls[0][0]
    const tags = marker._r(true, [])
    expect(tags[0].props.class).toEqual(new Set(['page', 'dark']))
    expect(tags[0].props.style).toEqual(new Map([['color', 'red'], ['display', 'block']]))
    expect(tags[1]).toMatchObject({ tag: 'meta', props: { name: 'description', content: 'Static' } })
    expect(JSON.stringify(marker)).not.toMatch(/"_(?:w|p)"/)
  })

  it('precompiles useSeoMeta after lowering and preserves entry options', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'const options = { tagPriority: 5 }',
      'useSeoMeta({ title: \'SEO\', description: \'Description\', ogImage: { url: \'/og.png\', width: 1200 } }, options)',
    ].join('\n'))
    expect(code).toContain('import { useHead } from \'unhead\'')
    const call = execute(code!).useHead.mock.calls[0]
    expect(call[0]._r).toBeTypeOf('function')
    expect(call[1]).toEqual({ tagPriority: 5 })

    const baseline = createHead({ disableDefaults: true })
    baseline.push({
      title: 'SEO',
      meta: [
        { property: 'og:image', content: '/og.png' },
        { property: 'og:image:width', content: 1200 },
        { name: 'description', content: 'Description' },
      ],
    }, { tagPriority: 5 })
    const compiled = createHead({ disableDefaults: true })
    compiled.push(call[0], call[1])
    expect(renderSSRHead(compiled)).toEqual(renderSSRHead(baseline))
  })

  it('bails per call for dynamic or unsafe syntax and still compiles siblings', async () => {
    const code = await transform([
      'const value = getTitle()',
      'useHead({ title: value })',
      'useHead({ title: \'static sibling\' })',
      'useHead({ [\'title\']: \'computed\' })',
      'useHead({ ...{ title: \'spread\' } })',
      'useHead({ get title() { return \'getter\' } })',
      'useHead({ __proto__: { polluted: true } })',
      'useHead({ title: 1e999 })',
    ].join('\n'))
    expect(code?.match(/__unhead_precompiled\(\[/g)).toHaveLength(1)
    expect(code?.match(/from 'virtual:unhead-precompiled-runtime'/g)).toHaveLength(1)
    expect(code).toContain('useHead({ title: value })')
    expect(code).toContain('useHead({ [\'title\']: \'computed\' })')
    expect(code).toContain('useHead({ title: 1e999 })')
  })

  it('requires unhead provenance and respects local shadowing', async () => {
    expect(await transform([
      'import { useHead } from \'another-head-library\'',
      'useHead({ title: \'foreign\' })',
    ].join('\n'))).toBeUndefined()
    expect(await transform([
      'useHead({ title: \'local\' })',
      'function useHead(input) { return input }',
    ].join('\n'))).toBeUndefined()
    expect(await transform([
      'import { useHead } from \'@unheadless/vue\'',
      'useHead({ title: \'foreign scope\' })',
    ].join('\n'))).toBeUndefined()
  })

  it('preserves default and type-only imports when rewriting useSeoMeta', async () => {
    const code = await transform([
      'import unheadDefault, { type ResolvableHead, useSeoMeta } from \'unhead\'',
      'useSeoMeta({ title: \'static\' })',
    ].join('\n'))
    expect(code).toContain('import unheadDefault, { type ResolvableHead, useHead } from \'unhead\'')
  })

  it('keeps useSeoMeta imported when a preserved options argument references it', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ title: \'static\' }, { onRendered: useSeoMeta })',
    ].join('\n'))
    expect(code).toContain('import { useHead, useSeoMeta } from \'unhead\'')
    expect(code).toContain('{ onRendered: useSeoMeta }')
  })

  it('preserves useSeoMeta when its patch-aware return value is observed', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'const entry = useSeoMeta({ description: \'initial\' })',
      'entry.patch({ description: \'patched\' })',
    ].join('\n'))
    expect(code).toBeUndefined()
  })

  it('precompiles static patches on a transformed const useHead entry', async () => {
    const code = await transform([
      'import { useHead } from \'unhead/precompiled/server\'',
      'const entry = useHead({ title: \'initial\' }, { head })',
      'entry.patch({ title: \'patched\' })',
    ].join('\n'), { seoMeta: false })
    expect(code?.match(/__unhead_precompiled\(\[/g)).toHaveLength(2)

    const patch = vi.fn()
    const useHead = vi.fn(() => ({ patch }))
    const body = code!.replace(/^import[^\n]*\n?/gm, '').replace(', { head }', '')
    // eslint-disable-next-line no-new-func -- transformed fixture is local static source
    new Function('useHead', '__unhead_precompiled', body)(useHead, precompiledHeadInput)
    expect(patch.mock.calls[0][0]._r(true, [])[0]).toMatchObject({ tag: 'title', textContent: 'patched' })
  })

  it('leaves server-only and safe composables out of scope', async () => {
    expect(await transform('useServerHead({ title: \'server\' })', { seoMeta: false })).toBeUndefined()
    expect(await transform('useHeadSafe({ title: \'safe\' })', { seoMeta: false })).toBeUndefined()
  })

  it('subsumes configured minification for compiled entries', async () => {
    const js = vi.fn(async (value: string) => value.replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ').trim())
    const code = await transform(
      'useHead({ script: [{ innerHTML: \'// comment\\nvar answer = 40 + 2;     console.log(answer);\' }] })',
      { seoMeta: false, minify: { js } },
    )
    const marker = execute(code!).useHead.mock.calls[0][0]
    expect(js).toHaveBeenCalledTimes(1)
    expect(marker._r(true, [])[0].innerHTML).toBe('var answer = 40 + 2; console.log(answer);')
    expect(code?.match(/__unhead_precompiled\(\[/g)).toHaveLength(1)
  })

  it('respects the minifier filter while precompiling', async () => {
    const js = vi.fn(async (value: string) => value.trim())
    const code = await transform(
      'useHead({ script: [{ innerHTML: \'    console.log("static content");    \' }] })',
      { seoMeta: false, minify: { filter: { exclude: [/page/] }, js } },
    )
    expect(code).toContain('__unhead_precompiled([')
    expect(js).not.toHaveBeenCalled()
  })

  it('skips JSON-like scripts during precompile minification', async () => {
    const js = vi.fn(async (value: string) => value.trim())
    const content = '{  "name": "example",  "value": true  }'
    const code = await transform(
      `useHead({ script: [{ type: 'application/ld+json', innerHTML: ${JSON.stringify(content)} }] })`,
      { seoMeta: false, minify: { js } },
    )
    expect(execute(code!).useHead.mock.calls[0][0]._r(true, [])[0].innerHTML).toBe(content)
    expect(js).not.toHaveBeenCalled()
  })

  it('matches runtime rendering and resolved structures for static fixtures', async () => {
    const fixtures = [
      { title: 'Title', titleTemplate: '%s · Site' },
      { title: 42 },
      { title: true },
      { htmlAttrs: { lang: 'en', class: ['one', 'two'], style: ['color: red'] } },
      { meta: [{ charset: 'utf-8' }, { name: 'description', content: 'hello' }, { name: 'theme-color', content: ['red', 'blue'] }] },
      { link: [{ rel: 'canonical', href: '/canonical' }, { rel: 'stylesheet', href: '/style.css' }] },
      { script: [{ type: 'application/json', innerHTML: { value: '<unsafe>' } }], style: [{ textContent: 'body { color: red; }' }] },
      { script: [{ key: 'app', src: '/app.js' }] },
      { meta: [{ name: 'object-content', content: { nested: 'value' } }] },
    ]
    for (const input of fixtures) {
      const code = await transform(`useHead(${JSON.stringify(input)})`, { seoMeta: false })
      const marker = execute(code!).useHead.mock.calls[0][0]
      const baseline = createHead({ disableDefaults: true })
      const compiled = createHead({ disableDefaults: true })
      baseline.push(input as any)
      compiled.push(marker)
      expect(resolveTags(compiled)).toEqual(resolveTags(baseline))
      expect(render(marker)).toEqual(render(input))
    }
  })

  it('bails on negative zero because JSON cannot preserve its identity', async () => {
    const code = await transform([
      'useHead({ htmlAttrs: { \'data-number\': -0 } })',
      'useHead({ title: \'compiled sibling\' })',
    ].join('\n'), { seoMeta: false })
    expect(code?.match(/__unhead_precompiled\(\[/g)).toHaveLength(1)
    expect(code).toContain('\'data-number\': -0')
  })

  it('property: every supported generated input is output-identical', async () => {
    const text = fc.string({ maxLength: 30 })
    const scalar = fc.oneof(text, fc.integer(), fc.boolean(), fc.constant(null))
    const inputArbitrary = fc.record({
      title: fc.option(text, { nil: undefined }),
      htmlAttrs: fc.option(fc.record({
        lang: text,
        class: fc.array(text, { maxLength: 4 }),
        style: fc.record({ color: text, display: text }),
      }), { nil: undefined }),
      meta: fc.array(fc.record({ name: text, content: scalar }), { maxLength: 4 }),
      link: fc.array(fc.record({
        rel: fc.constantFrom('canonical', 'stylesheet', 'preload'),
        href: text,
      }), { maxLength: 3 }),
      script: fc.array(fc.record({
        type: fc.constantFrom('text/javascript', 'application/json'),
        innerHTML: text,
      }), { maxLength: 2 }),
    })

    await fc.assert(fc.asyncProperty(inputArbitrary, async (input) => {
      const code = await transform(`useHead(${JSON.stringify(input)})`, { seoMeta: false })
      expect(code).toBeDefined()
      const marker = execute(code!).useHead.mock.calls[0][0]
      const baseline = createHead({ disableDefaults: true })
      const compiled = createHead({ disableDefaults: true })
      baseline.push(input as any)
      compiled.push(marker)
      expect(resolveTags(compiled)).toEqual(resolveTags(baseline))
      expect(render(marker)).toEqual(render(input))
    }), { numRuns: 100 })
  })

  it('property: supported useSeoMeta inputs are output-identical', async () => {
    const text = fc.string({ maxLength: 30 })
    const seoInput = fc.record({
      title: fc.option(text, { nil: undefined }),
      description: fc.option(text, { nil: undefined }),
      robots: fc.option(fc.record({
        noindex: fc.boolean(),
        nofollow: fc.boolean(),
        maxSnippet: fc.integer({ min: -1, max: 100 }),
      }), { nil: undefined }),
      ogImage: fc.option(fc.record({
        url: text,
        width: fc.integer({ min: 1, max: 4096 }),
        height: fc.integer({ min: 1, max: 4096 }),
      }), { nil: undefined }),
      themeColor: fc.array(text, { maxLength: 3 }),
    })

    await fc.assert(fc.asyncProperty(seoInput, async (input) => {
      const staticInput = JSON.parse(JSON.stringify(input))
      const code = await transform(`useSeoMeta(${JSON.stringify(staticInput)})`)
      expect(code).toBeDefined()
      const marker = execute(code!).useHead.mock.calls[0][0]
      const { title, ...flatMeta } = staticInput
      const baselineInput = {
        ...(title === undefined ? {} : { title }),
        meta: unpackMeta(flatMeta as any),
      }
      const baseline = createHead({ disableDefaults: true })
      const compiled = createHead({ disableDefaults: true })
      baseline.push(baselineInput as any)
      compiled.push(marker)
      expect(resolveTags(compiled)).toEqual(resolveTags(baseline))
      expect(renderSSRHead(compiled)).toEqual(renderSSRHead(baseline))
    }), { numRuns: 100 })
  })
})
