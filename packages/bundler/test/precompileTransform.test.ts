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
  const collect = spies[names[0]]
  // eslint-disable-next-line no-new-func -- transformed fixtures are local static source strings
  new Function(...names, 'head', body)(...names.map(name => spies[name]), { _p: { push: (...plans: any[]) => plans.forEach(collect) } })
  return spies
}

function baseline(input: any) {
  const head = createHead({ disableDefaults: true })
  head.push(input)
  return renderSSRHead(head, { omitLineBreaks: true })
}

function compiled(plan: any) {
  const head = createStaticHead({ disableDefaults: true })
  head._p.push(plan)
  return renderStaticHead(head)
}

function strictCall(input: unknown, name = 'useHead') {
  return [
    `import { ${name} } from 'unhead/precompiled/server'`,
    `${name}(${JSON.stringify(input)}, { head })`,
  ].join('\n')
}

function strictClientCall(input: unknown, name = 'useHead') {
  return [
    `import { ${name} } from 'unhead/precompiled/client'`,
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

  it('keeps the sealed client and server targets isolated', async () => {
    const code = strictCall({ title: 'client' })
    await expect(transform(code, { seoMeta: false }, { environment: { config: { consumer: 'client' } } }))
      .rejects
      .toThrow(/sealed server entry cannot be used in a client build/)
    await expect(transform(code, { seoMeta: false }, {}))
      .rejects
      .toThrow(/build target is unknown/)
    expect(await transform(code, { seoMeta: false }, { environment: { config: { consumer: 'server' } } })).toContain('__unhead_precompiled_plan_0')

    const client = await transform(strictClientCall({ title: 'client' }), { seoMeta: false }, { environment: { config: { consumer: 'client' } } })
    expect(client).toContain('head.push(__unhead_precompiled_plan_0)')
    expect(client).toContain('[100,"title","title",{},"client"]')
    await expect(transform(strictClientCall({ title: 'client' }), { seoMeta: false }))
      .rejects
      .toThrow(/sealed client entry cannot be used in a server build/)
  })

  it('selects the deferred SSR client facade only when requested', async () => {
    const eager = await transform(strictClientCall({ title: 'client' }), { seoMeta: false }, { environment: { config: { consumer: 'client' } } })
    expect(eager).toContain('from \'unhead/precompiled/client\'')
    expect(eager).not.toContain('client-deferred')

    const deferred = await transform(strictClientCall({ title: 'client' }), {
      seoMeta: false,
      precompile: { client: 'deferred' },
    }, { environment: { config: { consumer: 'client' } } })
    expect(deferred).toContain('from "unhead/precompiled/client-deferred"')
    expect(deferred).toContain('head.push(__unhead_precompiled_plan_0)')
  })

  it('uses sanitized inline content as the client adoption identity', async () => {
    const code = await transform(strictClientCall({
      script: [{ type: 'application/ld+json', innerHTML: { value: '</script><unsafe>' } }],
    }), { seoMeta: false }, { environment: { config: { consumer: 'client' } } })
    const declaration = code!.split('\n').find(line => line.startsWith('const __unhead_precompiled_plan_0 = '))
    expect(declaration).toBeTruthy()
    const plan = JSON.parse(declaration!.slice(declaration!.indexOf(' = ') + 3).replace(/;$/, ''))
    expect(plan[0][1]).not.toBe(`script:content:${plan[0][4]}`)
    expect(plan[0][7]).toBe(`script:content:${plan[0][4]}`)
    expect(plan[0][4]).not.toContain('</script>')
  })

  it('matches DOM adoption identities when special attributes are omitted or empty', async () => {
    const code = await transform(strictClientCall({
      link: [
        { rel: 'stylesheet', href: '' },
        { rel: 'alternate', href: '/alternate', hreflang: false },
      ],
      script: [{ id: false, src: '/app.js' }],
    }), { seoMeta: false }, { environment: { config: { consumer: 'client' } } })
    const declaration = code!.split('\n').find(line => line.startsWith('const __unhead_precompiled_plan_0 = '))!
    const plan = JSON.parse(declaration.slice(declaration.indexOf(' = ') + 3).replace(/;$/, ''))

    expect(plan.find((tag: any[]) => tag[3].src === '/app.js')[7]).toBe('script:src:/app.js')
    const alternate = plan.find((tag: any[]) => tag[3].href === '/alternate')
    expect(alternate[1]).toBe('link:alternate:/alternate')
    expect(alternate[7]).toBeUndefined()
  })

  it.each([
    ['unhead/precompiled/client-csr', {}, { environment: { config: { consumer: 'client' } } }],
    ['unhead/precompiled/client-deferred', {}, { environment: { config: { consumer: 'client' } } }],
    ['unhead/precompiled/client-snapshot', {}, { environment: { config: { consumer: 'client' } } }],
    ['unhead/precompiled/server-snapshot', {}, undefined],
    ['unhead/precompiled/server-unique', {}, undefined],
  ])('rejects a direct %s import without its matching profile option', async (source, precompile, context) => {
    await expect(transform(`import { createHead } from '${source}'\ncreateHead()`, {
      seoMeta: false,
      precompile,
    }, context as any)).rejects.toThrow(/requires the matching precompile option/)
  })

  it.each(['vue', 'react', 'solid-js', 'svelte'])('precompiles the %s lifecycle adapter without bypassing it', async (framework) => {
    const code = await transform([
      `import { useHead } from '@unhead/${framework}/precompiled'`,
      `useHead({ title: 'framework', meta: [{ name: 'description', content: 'static' }] }${framework === 'solid-js' || framework === 'svelte' ? ', { head }' : ''})`,
    ].join('\n'), { seoMeta: false }, { environment: { config: { consumer: 'client' } } })
    expect(code).toContain(`from "@unhead/${framework}/precompiled/client"`)
    expect(code).toContain(framework === 'solid-js' || framework === 'svelte'
      ? 'useHead(__unhead_precompiled_plan_0, { head })'
      : 'useHead(__unhead_precompiled_plan_0)')
    expect(code).not.toContain('head.push(')
  })

  it.each(['vue', 'react', 'solid-js', 'svelte'])('selects constrained %s client lifecycle adapters', async (framework) => {
    for (const client of ['csr', 'deferred'] as const) {
      const code = await transform([
        `import { createHead, useHead } from '@unhead/${framework}/precompiled'`,
        'const head = createHead()',
        `useHead({ title: 'profile' }${framework === 'solid-js' || framework === 'svelte' ? ', { head }' : ''})`,
      ].join('\n'), {
        seoMeta: false,
        precompile: { client },
      }, { environment: { config: { consumer: 'client' } } })
      expect(code).toContain(`from "@unhead/${framework}/precompiled/client-${client}"`)
      expect(code).toContain(framework === 'solid-js' || framework === 'svelte'
        ? 'useHead(__unhead_precompiled_plan_0, { head })'
        : 'useHead(__unhead_precompiled_plan_0)')
    }
  })

  it.each(['solid-js', 'svelte'])('requires an explicit head for the %s lifecycle adapter', async (framework) => {
    await expect(transform([
      `import { useHead } from '@unhead/${framework}/precompiled'`,
      'useHead({ title: \'missing head\' })',
    ].join('\n'), { seoMeta: false }, { environment: { config: { consumer: 'client' } } }))
      .rejects
      .toThrow(/second argument must be exactly \{ head \}/)
  })

  it('rejects unique identity mode for client profiles that retain winner resolution', async () => {
    for (const client of ['csr', 'deferred'] as const) {
      await expect(transform(strictClientCall({ title: 'unique' }), {
        seoMeta: false,
        precompile: { client, duplicates: 'error' },
      }, { environment: { config: { consumer: 'client' } } }))
        .rejects
        .toThrow(/requires the eager core client/)
    }
  })

  it('rejects unique identity mode for framework-only composable modules', async () => {
    await expect(transform([
      'import { useHead } from \'@unhead/vue/precompiled\'',
      'useHead({ title: \'framework\' })',
    ].join('\n'), {
      seoMeta: false,
      precompile: { duplicates: 'error' },
    }, { environment: { config: { consumer: 'client' } } }))
      .rejects
      .toThrow(/not available through framework adapters/)
  })

  it('targets the framework server adapter and rejects observed lifecycle handles', async () => {
    const server = await transform([
      'import { useSeoMeta } from \'@unhead/vue/precompiled\'',
      'useSeoMeta({ title: \'server\', description: \'static\' })',
    ].join('\n'), { seoMeta: false })
    expect(server).toContain('from "@unhead/vue/precompiled/server"')
    expect(server).toContain('useSeoMeta(__unhead_precompiled_plan_0)')

    await expect(transform([
      'import { useHead } from \'@unhead/react/precompiled\'',
      'const entry = useHead({ title: \'observed\' })',
    ].join('\n'), { seoMeta: false }, { environment: { config: { consumer: 'client' } } }))
      .rejects
      .toThrow(/return value cannot be observed/)
  })

  it('requires a known target for neutral framework adapters', async () => {
    await expect(transform([
      'import { useHead } from \'@unhead/svelte/precompiled\'',
      'useHead({ title: \'unknown\' })',
    ].join('\n'), { seoMeta: false }, {})).rejects.toThrow(/build target is unknown/)
  })

  it('keeps client entry handles while rejecting dynamic client inputs', async () => {
    const code = await transform([
      'import { useHead } from \'unhead/precompiled/client\'',
      'const entry = useHead({ meta: [{ name: \'description\', content: \'static\' }] }, { head })',
      'entry.dispose()',
    ].join('\n'), { seoMeta: false }, { environment: { config: { consumer: 'client' } } })
    expect(code).toContain('const entry = head.push(__unhead_precompiled_plan_0)')
    await expect(transform([
      'import { useHead } from \'unhead/precompiled/client\'',
      'useHead({ title: getTitle() }, { head })',
    ].join('\n'), { seoMeta: false }, { environment: { config: { consumer: 'client' } } }))
      .rejects
      .toThrow(/dynamic or unsupported value/)
  })

  it('merges adjacent unobserved client calls into one render plan', async () => {
    const code = await transform([
      'import { useHead } from \'unhead/precompiled/client\'',
      'useHead({ title: \'one\' }, { head })',
      'useHead({ meta: [{ name: \'description\', content: \'two\' }] }, { head })',
    ].join('\n'), { seoMeta: false }, { environment: { config: { consumer: 'client' } } })
    expect(code?.match(/head\.push\(/g)).toHaveLength(1)
    expect(code?.match(/__unhead_precompiled_plan_/g)).toHaveLength(2)
    expect(code).toContain('[100,"title","title",{},"one"],[100,"meta:description"')
  })

  it('does not merge an observed client entry with adjacent calls', async () => {
    const code = await transform([
      'import { useHead } from \'unhead/precompiled/client\'',
      'const entry = useHead({ title: \'one\' }, { head })',
      'useHead({ meta: [{ name: \'description\', content: \'two\' }] }, { head })',
      'entry.dispose()',
    ].join('\n'), { seoMeta: false }, { environment: { config: { consumer: 'client' } } })
    expect(code?.match(/head\.push\(/g)).toHaveLength(2)
  })

  it('batches an array of observed client entries into one render pass', async () => {
    const code = await transform([
      'import { useHead } from \'unhead/precompiled/client\'',
      'const entries = [',
      '  useHead({ title: \'one\' }, { head }),',
      '  useHead({ meta: [{ name: \'description\', content: \'two\' }] }, { head }),',
      ']',
      'entries.forEach(entry => entry.dispose())',
    ].join('\n'), { seoMeta: false }, { environment: { config: { consumer: 'client' } } })
    expect(code).toContain('const entries = [head.push(__unhead_precompiled_plan_0,0),head.push(__unhead_precompiled_plan_1)]')
  })

  it('marks unique clients and emits identity-free server plans', async () => {
    const client = await transform([
      'import { createHead, useHead } from \'unhead/precompiled/client\'',
      'const head = createHead()',
      'useHead({ title: \'unique\' }, { head })',
    ].join('\n'), {
      seoMeta: false,
      precompile: { duplicates: 'error' },
    }, { environment: { config: { consumer: 'client' } } })
    expect(client).toContain('const head = createHead(1)')

    const server = await transform([
      'import { createHead, useHead } from \'unhead/precompiled/server\'',
      'const head = createHead({ disableDefaults: true })',
      'useHead({ title: \'unique\' }, { head })',
    ].join('\n'), {
      seoMeta: false,
      precompile: { duplicates: 'error' },
    })
    expect(server).toContain('from "unhead/precompiled/server-unique"')
    expect(server).toContain('const head = ({_p:[]})')
    expect(server).toContain('const __unhead_precompiled_plan_0 = [[10,"<title>unique</title>"]]')
    expect(server).not.toContain('"title","<title>')
  })

  it('emits identity-free server defaults and rejects resolved tag observation', async () => {
    const defaults = await transform([
      'import { createHead, renderSSRHead } from \'unhead/precompiled/server\'',
      'const head = createHead()',
      'export const payload = renderSSRHead(head)',
    ].join('\n'), {
      seoMeta: false,
      precompile: { duplicates: 'error' },
    })
    expect(defaults).toContain('from "unhead/precompiled/server-unique"')
    expect(defaults).toContain('const __unhead_precompiled_defaults = [[-20,"<meta charset=')
    expect(defaults).not.toContain('"charset","<meta')

    const rendererExport = await transform('export { renderSSRHead } from \'unhead/precompiled/server\'', {
      seoMeta: false,
      precompile: { duplicates: 'error' },
    })
    expect(rendererExport).toContain('from "unhead/precompiled/server-unique"')

    await expect(transform([
      'import { createHead, resolveTags } from \'unhead/precompiled/server\'',
      'const head = createHead({ disableDefaults: true })',
      'resolveTags(head)',
    ].join('\n'), {
      seoMeta: false,
      precompile: { duplicates: 'error' },
    })).rejects.toThrow(/resolveTags.*unavailable/)

    await expect(transform('export { resolveTags } from \'unhead/precompiled/server\'', {
      seoMeta: false,
      precompile: { duplicates: 'error' },
    })).rejects.toThrow(/resolveTags.*unavailable/)
  })

  it('rejects duplicate identities across modules in unique mode', async () => {
    const plugin = UnheadTransforms.vite({
      consumer: 'server',
      treeshake: false,
      seoMeta: false,
      precompile: { duplicates: 'error' },
      minify: false,
    }) as any
    const context = { environment: { config: { consumer: 'server' } } }
    await plugin.transform.handler.call(context, [
      'import { createHead, useHead } from \'unhead/precompiled/server\'',
      'const head = createHead({ disableDefaults: true })',
      'useHead({ meta: [{ name: \'description\', content: \'one\' }] }, { head })',
    ].join('\n'), '/app/one.ts')

    await expect(plugin.transform.handler.call(context, [
      'import { useHead } from \'unhead/precompiled/server\'',
      'useHead({ meta: [{ name: \'description\', content: \'two\' }] }, { head })',
    ].join('\n'), '/app/two.ts')).rejects.toThrow(/duplicate identity "meta:description" in unique mode; first seen at \/app\/one\.ts/)
  })

  it('drops unique identity state when a watched module changes out of the transform', async () => {
    const plugin = UnheadTransforms.vite({
      consumer: 'client',
      treeshake: false,
      seoMeta: false,
      precompile: { duplicates: 'error' },
      minify: false,
    }) as any
    const context = { environment: { config: { consumer: 'client' } } }
    await plugin.transform.handler.call(context, strictClientCall({ title: 'first' }), '/app/first.ts')
    plugin.watchChange('/app/first.ts', { event: 'update' })
    await expect(plugin.transform.handler.call(context, strictClientCall({ title: 'second' }), '/app/second.ts'))
      .resolves
      .toBeTruthy()
  })

  it('rejects duplicate identities within one unique module', async () => {
    await expect(transform([
      'import { useHead } from \'unhead/precompiled/server\'',
      'useHead({ title: \'one\' }, { head })',
      'useHead({ title: \'two\' }, { head })',
    ].join('\n'), {
      seoMeta: false,
      precompile: { duplicates: 'error' },
    })).rejects.toThrow(/duplicate identity "title" in unique mode/)
  })

  it('finalizes a server snapshot into one build-time SSR payload', async () => {
    const code = await transform([
      'import { createHead, renderSSRHead, useHead } from \'unhead/precompiled/server\'',
      'const head = createHead({ disableDefaults: true })',
      'useHead({ title: \'first\', meta: [{ name: \'description\', content: \'one\' }] }, { head })',
      'useHead({ title: \'last\' }, { head })',
      'export const output = renderSSRHead(head)',
    ].join('\n'), {
      seoMeta: false,
      precompile: { mode: 'snapshot' },
    })
    expect(code).toContain('from "unhead/precompiled/server-snapshot"')
    expect(code).toContain('const __unhead_precompiled_snapshot = {"headTags":"<title>last</title><meta name=')
    expect(code).toContain('const head = createHead(__unhead_precompiled_snapshot)')
    expect(code).not.toContain('._p.push(')
    expect(code).not.toContain('__unhead_precompiled_plan_')
  })

  it('finalizes a client snapshot into one pre-resolved DOM plan', async () => {
    const code = await transform([
      'import { createHead, useHead } from \'unhead/precompiled/client\'',
      'const head = createHead()',
      'useHead({ title: \'first\' }, { head })',
      'useHead({ title: \'last\', meta: [{ name: \'description\', content: \'client\' }] }, { head })',
    ].join('\n'), {
      seoMeta: false,
      precompile: { mode: 'snapshot' },
    }, { environment: { config: { consumer: 'client' } } })
    expect(code).toContain('from "unhead/precompiled/client-snapshot"')
    expect(code).toContain('const __unhead_precompiled_snapshot = [[100,"title","title",{},"last"],[100,"meta:description"')
    expect(code).toContain('const head = createHead(__unhead_precompiled_snapshot)')
    expect(code).not.toContain('head.push(')
  })

  it('accepts the matching renderer from an explicit snapshot subpath', async () => {
    const code = await transform([
      'import { createHead, renderSSRHead, useHead } from \'unhead/precompiled/server-snapshot\'',
      'const head = createHead()',
      'useHead({ title: \'snapshot\' }, { head })',
      'export const output = renderSSRHead(head)',
    ].join('\n'), { seoMeta: false, precompile: { mode: 'snapshot' } })
    expect(code).toContain('createHead(__unhead_precompiled_snapshot)')
  })

  it('fails loudly when a strict source cannot be parsed', async () => {
    await expect(transform([
      'import { useHead } from \'unhead/precompiled/server\'',
      'useHead({ title: )',
    ].join('\n'), { seoMeta: false }))
      .rejects
      .toThrow(/strict precompile failed.*could not be parsed/)
  })

  it('rejects snapshot heads that escape an adjacent static block', async () => {
    await expect(transform([
      'import { createHead, useHead } from \'unhead/precompiled/server\'',
      'const head = createHead()',
      'observe(head)',
      'useHead({ title: \'late\' }, { head })',
    ].join('\n'), {
      seoMeta: false,
      precompile: { mode: 'snapshot' },
    })).rejects.toThrow(/snapshot calls must be adjacent to createHead/)

    await expect(transform([
      'import { createHead, useHead } from \'unhead/precompiled/server\'',
      'const head = createHead()',
      'useHead({ title: \'static\' }, { head })',
      'observe(head)',
    ].join('\n'), {
      seoMeta: false,
      precompile: { mode: 'snapshot' },
    })).rejects.toThrow(/snapshot head cannot escape its static block/)
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
    await expect(transform([
      'import { createHead } from \'unhead/precompiled/server\'',
      'const head = createHead({ omitLineBreaks: false })',
    ].join('\n'))).rejects.toThrow(/unsupported createHead option: omitLineBreaks/)
  })

  it('compiles static head creation into its minimal state object', async () => {
    const withDefaults = await transform([
      'import { createHead } from \'unhead/precompiled/server\'',
      'const head = createHead()',
    ].join('\n'))
    expect(withDefaults).toContain('const __unhead_precompiled_defaults = [[')
    expect(withDefaults).toContain('const head = ({_p:[__unhead_precompiled_defaults]})')

    const withoutDefaults = await transform([
      'import { createHead } from \'unhead/precompiled/server\'',
      'const head = createHead({ disableDefaults: true })',
    ].join('\n'))
    expect(withoutDefaults).not.toContain('__unhead_precompiled_defaults')
    expect(withoutDefaults).toContain('const head = ({_p:[]})')
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
    expect(code).toContain('head._p.push(__unhead_precompiled_plan_0)')
    expect(code).toContain('uh.renderSSRHead(head)')
  })

  it('recognizes quoted import names and static computed namespace calls', async () => {
    const quoted = await transform([
      'import { "useHead" as addHead } from \'unhead/precompiled/server\'',
      'addHead({ title: \'quoted\' }, { head })',
    ].join('\n'))
    expect(quoted).toContain('head._p.push(__unhead_precompiled_plan_0)')

    const computed = await transform([
      'import * as uh from \'unhead/precompiled/server\'',
      'uh[\'useHead\']({ title: \'computed\' }, { head })',
      'uh[\'renderSSRHead\'](head)',
    ].join('\n'))
    expect(computed).toContain('head._p.push(__unhead_precompiled_plan_0)')
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
      { meta: [{ charset: 'utf-8' }, { name: 'description', content: 'hello' }, { name: 'theme-color', content: 'red' }] },
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
    head._p.push(calls[0][0])
    expect(renderStaticHead(head).headTags).toBe([
      '<link rel="preconnect" href="https://cdn.example.com">',
      '<link rel="stylesheet" href="/style.css">',
      '<meta name="description" content="last">',
    ].join(''))
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
    sealed._p.push(calls[0][0])
    const normal = createHead({ disableDefaults: true })
    normal.push(first)
    normal.push(second)

    expect(renderStaticHead(sealed)).toEqual(renderSSRHead(normal, { omitLineBreaks: true }))
    expect(renderStaticHead(sealed).headTags).toBe('<script><\\/script></script><script><\\/script></script>')
  })

  it('rejects repeated arrayable identities', async () => {
    await expect(transform(strictCall({
      meta: [
        { property: 'og:image', content: '/a.png' },
        { property: 'og:image:width', content: 1200 },
        { property: 'og:image', content: '/b.png' },
      ],
    }))).rejects.toThrow(/arrayable meta identities may occur only once per call/)
  })

  it('matches attribute merge ordering across defaults and priorities', async () => {
    const input = { htmlAttrs: { lang: 'fr', tagPriority: -20 } }
    const code = await transform(strictCall(input))
    const plan = execute(code!).useHead.mock.calls[0][0]
    const sealed = createStaticHead()
    sealed._p.push(plan)
    const normal = createHead()
    normal.push(input)
    expect(renderStaticHead(sealed)).toEqual(renderSSRHead(normal, { omitLineBreaks: true }))
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
