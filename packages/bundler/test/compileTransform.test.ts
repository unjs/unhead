import { SourceMap, stripTypeScriptTypes } from 'node:module'
import { compileTags, dynamicValue } from 'unhead/compiled/server'
import { unpackMeta } from 'unhead/utils'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { CompileTransform } from '../src/unplugin/CompileTransform'
import { createFrameworkPlugin } from '../src/unplugin/framework'
import { Unhead } from '../src/unplugin/vite'
import { passesTransformFilter, runTransform } from './utils'

const server = { environment: { config: { consumer: 'server' } } }
const OBJECT_SEO_KEYS = ['ogImage', 'ogImageUrl', 'ogVideo', 'ogVideoUrl', 'ogAudio', 'ogAudioUrl', 'twitterImage', 'themeColor', 'googleSiteVerification', 'author', 'ogLocaleAlternate', 'articleAuthor', 'articleTag', 'bookAuthor', 'bookTag', 'robots', 'refresh', 'contentSecurityPolicy', 'appleItunesApp']
const IMPORTS = `import { useHead, useSeoMeta, useServerHead, useServerSeoMeta } from '@unhead/vue'\n`
const IMPORT_RE = /^import\s*\{([^}]*)\}\s*from\s*['"][^'"]+['"];?$/gm
const AS_RE = /\s+as\s+/

function transformResult(code: string, id = '/src/page.js', ctx: any = server, options: any = {}): { code: string, map: any } | undefined {
  return runTransform(CompileTransform.vite(options), code, id, ctx)
}

function transform(code: string, id?: string, ctx?: any, options?: any): string | undefined {
  return transformResult(code, id, ctx, options)?.code
}

function compiledTagsOf(input: any, valueCount = 0) {
  const result = compileTags(input, { valueCount })
  if (result._tag !== 'Ok')
    throw new Error(result.reason)
  return result.tags
}

interface Call { fn: string, args: any[] }

// Runs a module body with each named import bound to a recorder, so a test reads
// what every head call received at runtime.
function run(code: string, globals: Record<string, unknown> = {}): { calls: Call[], exports: Record<string, any> } {
  const calls: Call[] = []
  const exports: Record<string, any> = {}
  const record = (fn: string) => (...args: any[]) => {
    calls.push({ fn, args })
    return args[0]
  }
  const bindings: string[] = []
  const body = code.replace(IMPORT_RE, (_, specifiers: string) => {
    for (const specifier of specifiers.split(',').map(s => s.trim()).filter(Boolean)) {
      const [imported, local = imported] = specifier.split(AS_RE)
      bindings.push(`const ${local} = __record(${JSON.stringify(imported)})`)
    }
    return ''
  }).replace('export default', '__exports.default =')
  // eslint-disable-next-line no-new-func
  new Function('__record', '__exports', ...Object.keys(globals), `${bindings.join('\n')}\n${body}`)(record, exports, ...Object.values(globals))
  return { calls, exports }
}

function calls(code: string | undefined, globals?: Record<string, unknown>): Call[] {
  expect(code).toBeTypeOf('string')
  return run(code!, globals).calls
}

// a build loads the compiler in `buildStart`, before any transform
beforeAll(() => (CompileTransform.vite({}) as any).buildStart.call(server))

describe('compile transform', () => {
  it('waits for the compiler when a bundler skips buildStart', async () => {
    vi.resetModules()
    // a fresh module, whose compiler has not loaded
    const fresh = await import('../src/unplugin/CompileTransform')
    const pending = runTransform(fresh.CompileTransform.vite({}), `${IMPORTS}useHead({ title: 'A' })`, '/src/page.js', server)
    expect(pending).toBeInstanceOf(Promise)
    expect((await pending)?.code).toContain('useCompiledHead')
  })

  it('compiles a static useHead call to module scope compiled tags', () => {
    const result = calls(transform(`${IMPORTS}function setup() { useHead({ title: 'Hello', meta: [{ name: 'description', content: 'World' }] }) }\nsetup()\nsetup()`))
    expect(result.map(call => call.fn)).toEqual(['useCompiledHead', 'useCompiledHead'])
    expect(result[0]!.args).toEqual([compiledTagsOf({ title: 'Hello', meta: [{ name: 'description', content: 'World' }] })])
    expect(result[0]!.args[0]).toBe(result[1]!.args[0])
  })

  it('turns each dynamic leaf into a value in source order', () => {
    const result = calls(transform(`${IMPORTS}useHead({ title: name, meta: [{ name: 'description', content: getDescription() }], link: [{ rel: 'canonical', href: \`/\${slug}\` }] })`), {
      name: 'Name',
      getDescription: () => 'Description',
      slug: 'a',
    })
    expect(result[0]).toEqual({
      fn: 'useCompiledHead',
      args: [
        compiledTagsOf({ title: dynamicValue(0), meta: [{ name: 'description', content: dynamicValue(1) }], link: [{ rel: 'canonical', href: dynamicValue(2) }] }, 3),
        ['Name', 'Description', '/a'],
      ],
    })
  })

  it('evaluates each value once, in source order, before the options', () => {
    const log: string[] = []
    const at = (value: string) => {
      log.push(value)
      return value
    }
    const result = calls(transform(`${IMPORTS}useHead({ meta: [{ name: 'a', content: at('1') }], title: at('2') }, { head: at('3') })`), { at })
    expect(log).toEqual(['1', '2', '3'])
    expect(result[0]!.args.slice(1)).toEqual([['1', '2'], { head: '3' }])
  })

  it('passes refs and getters through unresolved', () => {
    const title = { value: 'ref' }
    const result = calls(transform(`${IMPORTS}useHead({ title, meta: [{ name: 'description', content: () => title.value }] })`), { title })
    const [, values] = result[0]!.args
    expect(values[0]).toBe(title)
    expect(values[1]).toBeTypeOf('function')
  })

  it('keeps a static options argument holding only head', () => {
    const head = {}
    const result = calls(transform(`${IMPORTS}useHead({ title: 'A' }, { head })`), { head })
    expect(result[0]!.args).toEqual([compiledTagsOf({ title: 'A' }), undefined, { head }])
  })

  it('unwraps as const and satisfies', () => {
    const code = transform(`${IMPORTS}const title = 'T' as const\nuseHead({ title: title as string, meta: [{ name: 'x', content: 'y' } as const] } satisfies object)`, '/src/page.ts')
    const result = calls(stripTypeScriptTypes(code!))
    expect(result[0]!.args).toEqual([compiledTagsOf({ title: dynamicValue(0), meta: [{ name: 'x', content: 'y' }] }, 1), ['T']])
  })

  it('compiles what <script setup> compiles to', () => {
    // `compileScript` output of a `<script setup>` block with an inline template
    const sfc = `import { defineComponent as _defineComponent } from 'vue'
import { ssrInterpolate as _ssrInterpolate } from "vue/server-renderer"

import { useHead, useSeoMeta } from '@unhead/vue'
import { ref } from 'vue'
const description = 'x'

export default /*@__PURE__*/_defineComponent({
  __name: 'App',
  __ssrInlineRender: true,
  setup(__props) {

const title = ref('Hello')
useHead({ title, meta: [{ name: 'description', content: description }] })
useSeoMeta({ ogTitle: () => title.value })

return (_ctx,_push,_parent,_attrs) => {
  _push(\`<div>\${_ssrInterpolate(title.value)}</div>\`)
}
}

})`
    const { calls: result, exports } = run(transform(sfc, '/src/App.vue')!)
    expect(result.map(call => call.fn)).toEqual(['defineComponent'])
    exports.default.setup()
    expect(result.map(call => call.fn)).toEqual(['defineComponent', 'ref', 'useCompiledHead', 'useCompiledSeoMeta'])
    expect(result[2]!.args).toEqual([compiledTagsOf({ title: dynamicValue(0), meta: [{ name: 'description', content: dynamicValue(1) }] }, 2), ['Hello', 'x']])
  })

  // A project can replace an auto import with its own function, and the transform cannot see that
  it('leaves a name that nothing declares as written, unless the integration names it', () => {
    const code = `useHead({ title: 'A' })\nuseSeoMeta({ description: 'B' })`
    expect(transform(code)).toBeUndefined()
    const written: unknown[] = []
    const compiled = transform(code, undefined, server, { autoImports: ['useHead'] })
    expect(calls(compiled, { injectHead: () => null, useSeoMeta: (input: unknown) => written.push(input) }).map(call => call.fn))
      .toEqual(['useCompiledHead'])
    expect(written).toEqual([{ description: 'B' }])
  })

  it('compiles the auto-import shape and lets the auto-imported injectHead pick the head', () => {
    const code = transform(`function setup() { useHead({ title: 'A' }) }\nsetup()`, undefined, server, { autoImports: ['useHead'] })
    const head = {}
    expect(calls(code, { injectHead: () => head })[0]!.args).toEqual([compiledTagsOf({ title: 'A' }), undefined, { head }])
    expect(calls(code)[0]!.args).toEqual([compiledTagsOf({ title: 'A' }), undefined, { head: undefined }])
  })

  it('compiles an aliased import', () => {
    const result = calls(transform(`import { useHead as setHead } from '@unhead/vue'\nsetHead({ title: 'A' })`))
    expect(result[0]!.args).toEqual([compiledTagsOf({ title: 'A' })])
  })

  it('compiles imports from importPaths', () => {
    const code = `import { useHead } from '~/head'\nuseHead({ title: 'A' })`
    expect(transform(code)).toBeUndefined()
    const head = {}
    expect(calls(transform(code, undefined, server, { importPaths: ['~/head'] }), { injectHead: () => head })[0]!.args)
      .toEqual([compiledTagsOf({ title: 'A' }), undefined, { head }])
  })

  it('compiles imports from nuxt/app by default', () => {
    const code = transform(`import { injectHead, useHead } from 'nuxt/app'\nuseHead({ title: 'A' })`)
    // the recorder stands in for injectHead, so the head is what it returns
    expect(calls(code).map(call => call.fn)).toEqual(['injectHead', 'useCompiledHead'])
    expect(calls(code)[1]!.args).toEqual([compiledTagsOf({ title: 'A' }), undefined, { head: undefined }])
  })

  // a file with no auto import, such as the runtime of a module, has no `injectHead` in scope
  it('imports injectHead from nuxt/app for a composable that the file imports from there', () => {
    const code = transform(`import { useHead } from 'nuxt/app'\nuseHead({ title: 'A' })`)
    expect(calls(code).map(call => call.fn)).toEqual(['injectHead', 'useCompiledHead'])
    // a local of the same name does not take its place
    const local = transform(`import { useHead } from 'nuxt/app'\nconst injectHead = () => 'local'\nuseHead({ title: 'A' })`)
    expect(calls(local)).toEqual([
      { fn: 'injectHead', args: [] },
      { fn: 'useCompiledHead', args: [compiledTagsOf({ title: 'A' }), undefined, { head: undefined }] },
    ])
  })

  it('imports injectHead from #imports when the integration names it', () => {
    const code = `import { useHead } from '#imports'\nuseHead({ title: 'A' })`
    expect(calls(transform(code, undefined, server, { autoImports: ['useHead'] })).map(call => call.fn))
      .toEqual(['useCompiledHead'])
    expect(calls(transform(code, undefined, server, { autoImports: ['useHead', 'injectHead'] })).map(call => call.fn))
      .toEqual(['injectHead', 'useCompiledHead'])
  })

  // `#imports` exports every auto import by its name, a replaced one too
  it('compiles an import from #imports only when the integration names it', () => {
    const code = `import { injectHead, useHead as setHead, useSeoMeta } from '#imports'\nsetHead({ title: 'A' })\nuseSeoMeta({ description: 'B' })`
    expect(transform(code)).toBeUndefined()
    expect(transform(code, undefined, server, { autoImports: ['setHead'] })).toBeUndefined()
    expect(calls(transform(code, undefined, server, { autoImports: ['useHead'] })).map(call => call.fn))
      .toEqual(['injectHead', 'useCompiledHead', 'useSeoMeta'])
    expect(calls(transform(code, undefined, server, { importPaths: ['#imports'] })).map(call => call.fn))
      .toEqual(['injectHead', 'useCompiledHead', 'injectHead', 'useStaticCompiledSeoMeta'])
  })

  // Nuxt UI keeps its head input in a const before the call
  it('compiles a const object input that only the call reads', () => {
    const code = transform(`${IMPORTS}const root = { value: 'a' }
const headData = { style: [{ innerHTML: root, id: 'colors' }], title: 'T' }
useHead(headData)`)
    expect(code).not.toContain('useHead(headData)')
    const result = calls(code)
    expect(result[0]!.args).toEqual([compiledTagsOf({ style: [{ innerHTML: dynamicValue(0), id: 'colors' }], title: 'T' }, 1), [{ value: 'a' }]])
  })

  it.each([
    ['a second reference', `const headData = { title: 'T' }\nuseHead(headData)\nheadData.title = 'U'`],
    ['let', `let headData = { title: 'T' }\nuseHead(headData)`],
    // another module can change an export before the call reads it
    ['an export', `export const headData = { title: 'T' }\nuseHead(headData)`],
    ['an export list', `const headData = { title: 'T' }\nexport { headData }\nuseHead(headData)`],
    ['a non-literal init', `const headData = make()\nuseHead(headData)`],
    ['a parameter', `function f(headData) { useHead(headData) }`],
  ])('leaves an identifier input with %s', (_, body) => {
    expect(transform(`${IMPORTS}${body}`)).toBeUndefined()
  })

  it('compiles a getter input that returns an object literal, with one getter call for all values', () => {
    let reads = 0
    const read = () => `${++reads}`
    const result = calls(transform(`${IMPORTS}useHead(() => ({ title: read(), meta: [{ name: 'description', content: read() }, { name: 'robots', content: 'index' }] }))`), { read })
    expect(result[0]!.fn).toBe('useCompiledHead')
    expect(result[0]!.args[0]).toEqual(compiledTagsOf({ title: dynamicValue(0), meta: [{ name: 'description', content: dynamicValue(1) }, { name: 'robots', content: 'index' }] }, 2))
    expect(reads).toBe(0)
    expect(result[0]!.args[1]()).toEqual(['1', '2'])
  })

  it('keeps the statements of a getter input that returns its object last', () => {
    const result = calls(transform(`${IMPORTS}useHead(() => {
  const title = page.title
  return { title, link: [{ rel: 'canonical', href: \`/\${title}\` }] }
}, { head })`), { page: { title: 'a' }, head: 'h' })
    expect(result[0]!.args[0]).toEqual(compiledTagsOf({ title: dynamicValue(0), link: [{ rel: 'canonical', href: dynamicValue(1) }] }, 2))
    expect(result[0]!.args[1]()).toEqual(['a', '/a'])
    expect(result[0]!.args[2]).toEqual({ head: 'h' })
  })

  it('compiles a static getter input to compiled tags only', () => {
    expect(calls(transform(`${IMPORTS}useHead(() => ({ title: 'T' }))`))[0]!.args).toEqual([compiledTagsOf({ title: 'T' })])
  })

  it.each([
    ['a conditional shape', `useHead(() => canonical ? { link: [{ rel: 'canonical', href: canonical }] } : {})`],
    ['an early return', `useHead(() => { if (!page) return {}; return { title: page.title } })`],
    ['a returned variable', `useHead(() => { const input = { title: 'T' }; return input })`],
    ['a parameter', `useHead(input => ({ title: input }))`],
    ['an async getter', `useHead(async () => ({ title: 'T' }))`],
    ['a spread', `useHead(() => ({ ...base, title: 'T' }))`],
    // v3 useSeoMeta reads no keys of a function, so it renders nothing for one
    ['a useSeoMeta getter', `useSeoMeta(() => ({ title: 'T' }))`],
  ])('leaves a getter input with %s', (_, body) => {
    expect(transform(`${IMPORTS}${body}`)).toBeUndefined()
  })

  it.each([
    ['a media list', `ogImage: [{ url: value, width: 1200 }]`, { ogImage: [{ url: '/b.png', width: 1200 }] }],
    ['a string list', `articleTag: [value, 'static']`, { articleTag: ['/b.png', 'static'] }],
    ['a media object', `twitterImage: { url: value }`, { twitterImage: { url: '/b.png' } }],
  ])('compiles %s with a value at a place of a static shape', (_, entry, flat) => {
    const result = calls(transform(`${IMPORTS}useSeoMeta({ ${entry} })`), { value: '/a.png' })
    expect(result[0]!.fn).toBe('useCompiledSeoMeta')
    expect(result[0]!.args[1](['/b.png'])).toEqual({ _flatMeta: flat })
    expect(result[0]!.args[2]).toEqual(['/a.png'])
  })

  it('compiles head calls in the runtime files of a module in node_modules', () => {
    const source = `import { useHead } from '#imports'\nuseHead({ title: 'A' })`
    const options = { autoImports: ['useHead'] }
    expect(transform(source, '/app/node_modules/.pnpm/@nuxt+ui@4.0.0/node_modules/@nuxt/ui/dist/runtime/plugins/colors.js', server, options)).toContain('useCompiledHead')
    expect(transform(source, '/app/node_modules/pkg/dist/index.mjs', server, options)).toBeUndefined()
  })

  // only a Vite build tells the plugin which build is the server build
  it.each(['webpack', 'rspack', 'rollup'])('leaves every head call as written under %s', (framework) => {
    const source = `${IMPORTS}useHead({ title: 'A' })`
    const plugin = (CompileTransform as any).raw({}, { framework })
    plugin.webpack?.({ name: 'server' })
    expect(runTransform(plugin, source, '/app/src/page.js', {})).toBeUndefined()
    expect(runTransform(plugin, source, '/app/src/page.js', server)).toBeUndefined()
  })

  it('compiles a dependency that filter.include names', () => {
    const source = `${IMPORTS}useHead({ title: 'A' })`
    const id = '/app/node_modules/docus/app/app.config.ts'
    expect(transform(source, id)).toBeUndefined()
    expect(transform(source, id, server, { filter: { include: [/[\\/]node_modules[\\/]docus[\\/]/] } })).toContain('useCompiledHead')
  })

  it('resolves the compiled runtime from the app for a module in node_modules', async () => {
    const plugin = CompileTransform.vite({}) as any
    const resolved = { id: '/app/node_modules/@unhead/vue/dist/compiled.mjs' }
    const ctx = { resolve: async (id: string, importer?: string) => importer ? null : id === '@unhead/vue/compiled/server' ? resolved : null }
    expect(await plugin.resolveId.call(ctx, '@unhead/vue/compiled/server', '/app/node_modules/@nuxt/ui/dist/runtime/plugins/colors.js')).toBe(resolved)
    expect(await plugin.resolveId.call(ctx, '@unhead/vue/compiled/server', '/app/src/page.js')).toBeUndefined()
  })

  it('warns at build time about a function titleTemplate', () => {
    const warnings: string[] = []
    const result = transformResult(`${IMPORTS}useHead({ titleTemplate: t => t ? \`\${t} - Site\` : 'Site' })`, '/src/app.vue', { ...server, warn: (message: string) => warnings.push(message) })
    expect(result).toBeUndefined()
    expect(warnings).toEqual([expect.stringContaining(`'%s %separator %siteName'`)])
  })

  // `app/pages/learn-lighthouse/[...slug].vue` of unlighthouse.dev
  it('warns at build time about a link whose identity holds a dynamic value', () => {
    const warnings: string[] = []
    const ctx = { ...server, warn: (message: string) => warnings.push(message) }
    const result = transformResult(`${IMPORTS}useHead({ link: [{ rel: 'prev', href: previousLink.href }] })`, '/app/pages/learn.vue', ctx)
    expect(result).toBeUndefined()
    expect(warnings).toEqual([expect.stringContaining(`add a key, such as key: 'prev'`)])
    // with a key the href is no longer identity, so the call compiles
    expect(transform(`${IMPORTS}useHead({ link: [{ key: 'prev', rel: 'prev', href: previousLink.href }] })`, '/app/pages/learn.vue', ctx)).toContain('useCompiledHead(')
    expect(warnings).toHaveLength(1)
  })

  it('compiles useServerHead and useServerSeoMeta', () => {
    const result = calls(transform(`${IMPORTS}useServerHead({ title: 'A' })\nuseServerSeoMeta({ description: 'B' })`))
    expect(result).toEqual([
      { fn: 'useCompiledHead', args: [compiledTagsOf({ title: 'A' })] },
      { fn: 'useStaticCompiledSeoMeta', args: [compiledTagsOf({ meta: [{ name: 'description', content: 'B' }] })] },
    ])
  })

  it('expands a static useSeoMeta call at build time', () => {
    const flat = { description: 'D', ogImage: { url: '/a.png', width: 1200 }, robots: { index: true, maxSnippet: -1 }, themeColor: [{ content: 'red', media: 'x' }] }
    const result = calls(transform(`${IMPORTS}useSeoMeta({ title: 'T', description: 'D', ogImage: { url: '/a.png', width: 1200 }, robots: { index: true, maxSnippet: -1 }, themeColor: [{ content: 'red', media: 'x' }] })`))
    expect(result[0]).toEqual({ fn: 'useStaticCompiledSeoMeta', args: [compiledTagsOf({ title: 'T', meta: unpackMeta(flat as any) })] })
  })

  // the runtime call of a static useSeoMeta call takes no values, so its options come second
  it('passes the head of a static useSeoMeta call with no values slot', () => {
    const head = {}
    expect(calls(transform(`${IMPORTS}useSeoMeta({ title: 'T' }, { head })`), { head }))
      .toEqual([{ fn: 'useStaticCompiledSeoMeta', args: [compiledTagsOf({ title: 'T' }), { head }] }])
    expect(calls(transform(`function setup() { useSeoMeta({ title: 'T' }) }\nsetup()`, undefined, server, { autoImports: ['useSeoMeta'] }), { injectHead: () => head }))
      .toEqual([{ fn: 'useStaticCompiledSeoMeta', args: [compiledTagsOf({ title: 'T' }), { head }] }])
  })

  it('compiles a useHead call with the seoMeta marker, and keeps the marker', () => {
    const head = {}
    expect(calls(transform(`${IMPORTS}useHead({ title: 'T' }, { seoMeta: true })\nuseHead({ title: v }, { head, seoMeta: true })`), { head, v: 'V' })).toEqual([
      { fn: 'useCompiledHead', args: [compiledTagsOf({ title: 'T' }), undefined, { seoMeta: true }] },
      { fn: 'useCompiledHead', args: [compiledTagsOf({ title: dynamicValue(0) }, 1), ['V'], { head, seoMeta: true }] },
    ])
    expect(transform(`${IMPORTS}useHead({ title: 'T' }, { seoMeta: false })`)).toBeUndefined()
  })

  // an auto import resolves the head of the integration, which the marker must not replace
  it('lets the auto-imported injectHead pick the head of a call with only the seoMeta marker', () => {
    const head = {}
    const code = transform(`function setup() { useHead({ title: 'A' }, { seoMeta: true }) }\nsetup()`, undefined, server, { autoImports: ['useHead'] })
    expect(calls(code, { injectHead: () => head })).toEqual([{ fn: 'useCompiledHead', args: [compiledTagsOf({ title: 'A' }), undefined, { head, seoMeta: true }] }])
  })

  it('compiles a dynamic useSeoMeta call with a full runtime fallback for its values', () => {
    const result = calls(transform(`${IMPORTS}useSeoMeta({ title: t, description: d, ogType: 'website' })`), { t: 'T', d: 'D' })
    const [compiledTags, loose, values] = result[0]!.args
    expect(result[0]!.fn).toBe('useCompiledSeoMeta')
    // v3 makes no tag for an undefined title or flat meta key, so both tags drop then
    expect(compiledTags).toEqual(compiledTagsOf({ title: dynamicValue(0), meta: [{ name: 'description', content: dynamicValue(1) }, { property: 'og:type', content: 'website' }] }, 2)
      .map((tag, i) => i === 1 ? [...tag.slice(0, 5), tag[5]! | 8] : tag))
    expect(values).toEqual(['T', 'D'])
    expect(loose(['T2', 'D2'])).toEqual({ title: 'T2', _flatMeta: { description: 'D2', ogType: 'website' } })
  })

  // Each key that `unpackMeta` also expands from an object or a list: the media keys and
  // their url aliases, the keys v3 may repeat, and the packed keys. A string makes one tag.
  it.each(OBJECT_SEO_KEYS)('compiles a dynamic %s value into one tag with a full runtime fallback', (key) => {
    const result = calls(transform(`${IMPORTS}useSeoMeta({ ${key}: value, description: 'D' })`), { value: 'x' })
    const [compiledTags, loose, values] = result[0]!.args
    expect(result[0]!.fn).toBe('useCompiledSeoMeta')
    expect(compiledTags.filter((tag: any) => tag[5] & 4)).toHaveLength(1)
    expect(values).toEqual(['x'])
    expect(loose([{ url: '/a.png' }])).toEqual({ _flatMeta: { [key]: { url: '/a.png' }, description: 'D' } })
  })

  it('compiles a head call inside a value of another', () => {
    const result = calls(transform(`${IMPORTS}useHead({ title: (useHead({ title: 'inner' }), 'outer') })`))
    expect(result).toEqual([
      { fn: 'useCompiledHead', args: [compiledTagsOf({ title: 'inner' })] },
      { fn: 'useCompiledHead', args: [compiledTagsOf({ title: dynamicValue(0) }, 1), ['outer']] },
    ])
  })

  it('compiles a keyless JSON-LD script whose content is a value', () => {
    const result = calls(transform(`${IMPORTS}useHead({ script: [{ type: 'application/ld+json', innerHTML: JSON.stringify({ headline: title }) }] })`), { title: 'Post' })
    expect(result).toEqual([
      { fn: 'useCompiledHead', args: [compiledTagsOf({ script: [{ type: 'application/ld+json', innerHTML: dynamicValue(0) }] }, 1), ['{"headline":"Post"}']] },
    ])
  })

  it('leaves a call that bails as written and still compiles the others', () => {
    const code = transform(`${IMPORTS}useHead({ ...input })\nuseHead({ title: 'B' })`)
    expect(code).toContain('useHead({ ...input })')
    expect(calls(code, { input: { title: 'A' } })).toEqual([
      { fn: 'useHead', args: [{ title: 'A' }] },
      { fn: 'useCompiledHead', args: [compiledTagsOf({ title: 'B' })] },
    ])
  })

  it('shares a const between identical compiled tags', () => {
    const result = calls(transform(`${IMPORTS}useHead({ title: 'A' })\nuseHead({ title: 'A' })`))
    expect(result[0]!.args[0]).toBe(result[1]!.args[0])
  })

  it('picks local names that do not collide with the module', () => {
    const result = calls(transform(`${IMPORTS}const __unhead_p0 = 'mine'\nconst __unhead_useCompiledHead = 'mine'\nuseHead({ title: 'A', meta: [{ name: 'x', content: __unhead_p0 + __unhead_useCompiledHead }] })`))
    expect(result[0]!.args).toEqual([compiledTagsOf({ title: 'A', meta: [{ name: 'x', content: dynamicValue(0) }] }, 1), ['minemine']])
  })

  it('keeps a call in a braceless if inside that if', () => {
    const code = transform(`${IMPORTS}if (flag) useHead({ title: 'A' })\nafter()`)
    let after = 0
    expect(calls(code, { flag: false, after: () => after++ })).toEqual([])
    expect(calls(code, { flag: true, after: () => after++ })).toHaveLength(1)
    expect(after).toBe(2)
  })

  it('maps the output back to the source', () => {
    const source = `${IMPORTS}useHead({ title: getTitle() })\nconst marker = 1\n`
    const result = transformResult(source)!
    const map = new SourceMap(result.map)
    const lines = result.code.split('\n')
    const valueLine = lines.findIndex(line => line.includes('getTitle()'))
    expect(map.findEntry(valueLine, lines[valueLine]!.indexOf('getTitle()'))).toMatchObject({ originalLine: 1, originalColumn: source.split('\n')[1]!.indexOf('getTitle()') })
    const markerLine = lines.findIndex(line => line.includes('marker'))
    expect(map.findEntry(markerLine, 0)).toMatchObject({ originalLine: 2, originalColumn: 0 })
  })

  it('places the compiled tags before any statement that could run a head call', () => {
    const result = calls(transform(`'use strict'\nimport { useHead } from '@unhead/vue'\nsetup()\nfunction setup() { useHead({ title: 'A' }) }\nimport { x } from 'x'`))
    expect(result.map(call => call.fn)).toEqual(['useCompiledHead'])
  })

  it.each([
    ['client', { environment: { config: { consumer: 'client' } } }],
    ['unknown', {}],
  ])('leaves a %s build alone', (_, ctx) => {
    expect(transform(`${IMPORTS}useHead({ title: 'A' })`, undefined, ctx)).toBeUndefined()
  })

  it('applies to builds only', () => {
    const plugin = CompileTransform.vite({}) as any
    expect(plugin.apply({}, { command: 'serve' })).toBe(false)
    expect(plugin.apply({}, { command: 'build', isSsrBuild: true })).toBe(true)
    expect(transform(`${IMPORTS}useHead({ title: 'A' })`, undefined, {}, {})).toBeUndefined()
  })

  it.each([
    ['a CommonJS module', '/src/page.cjs'],
    ['a style block', '/src/App.vue?vue&type=style&index=0&lang.css'],
    ['a dependency', '/node_modules/pkg/index.js'],
    ['a dependency runtime file in CommonJS', '/node_modules/pkg/dist/runtime/a.cjs'],
  ])('skips %s', (_, id) => {
    expect(transform(`${IMPORTS}useHead({ title: 'A' })`, id)).toBeUndefined()
  })

  it('does not parse a module without a head call', () => {
    expect(passesTransformFilter(CompileTransform.vite({}), '/src/page.js', 'export const value = useHeadSafe')).toBe(false)
  })

  describe('bails', () => {
    it.each([
      ['spread', `useHead({ ...input })`],
      ['spread in a tag', `useHead({ meta: [{ ...meta }] })`],
      ['computed key', `useHead({ [key]: 'x' })`],
      ['identifier input', `useHead(input)`],
      ['computed input', `useHead(computed(() => ({ title: 'x' })))`],
      ['dynamic list', `useHead({ meta: metas })`],
      ['conditional list', `useHead({ meta: flag ? [a] : [] })`],
      ['spread list', `useHead({ meta: [...metas] })`],
      ['dynamic list item', `useHead({ meta: [flag ? a : b] })`],
      ['dynamic tag object', `useHead({ htmlAttrs: attrs })`],
      ['handler', `useHead({ script: [{ src: '/a.js', onload: () => {} }] })`],
      ['handler string', `useHead({ script: [{ src: '/a.js', onload: 'go()' }] })`],
      ['function titleTemplate', `useHead({ titleTemplate: t => \`\${t} | Site\` })`],
      ['dynamic titleTemplate', `useHead({ titleTemplate: template })`],
      ['dynamic tagPriority', `useHead({ meta: [{ name: 'a', content: 'b', tagPriority: p }] })`],
      ['dynamic tagPosition', `useHead({ script: [{ innerHTML: 'x', tagPosition: p }] })`],
      ['dynamic key', `useHead({ meta: [{ name: 'a', content: 'b', key: k }] })`],
      ['dynamic meta name', `useHead({ meta: [{ name: n, content: 'b' }] })`],
      ['dynamic link rel', `useHead({ link: [{ rel: r, href: '/a' }] })`],
      ['dynamic template param', `useHead({ templateParams: { site: s } })`],
      ['dynamic class', `useHead({ htmlAttrs: { class: c } })`],
      ['getter property', `useHead({ get title() { return 'x' } })`],
      ['method property', `useHead({ title() { return 'x' } })`],
      ['prototype key', `useHead({ __proto__: null, title: 'x' })`],
      ['private use token', `useHead({ title: '\\uE0000\\uE001' })`],
      ['options with more than head', `useHead({ title: 'x' }, { head, tagPriority: 1 })`],
      ['options identifier', `useHead({ title: 'x' }, options)`],
      ['empty options', `useHead({ title: 'x' }, {})`],
      ['no argument', `useHead()`],
      ['third argument', `useHead({ title: 'x' }, { head }, extra)`],
      ['optional call', `useHead?.({ title: 'x' })`],
      // the value is the identity of the tag
      ['seo charset value', `useSeoMeta({ charset: c })`],
      ['seo tag option', `useSeoMeta({ description: 'x', tagPriority: 'high' })`],
      ['seo empty value', `useSeoMeta({ description: '' })`],
      ['seo true value', `useSeoMeta({ description: 'true' })`],
      ['seo used result', `const entry = useSeoMeta({ description: 'x' })`],
      ['seo options', `useSeoMeta({ description: 'x' }, { nuxt })`],
    ])('%s', (_, call) => {
      expect(transform(`${IMPORTS}${call}`)).toBeUndefined()
    })

    it.each([
      ['a local function', `function useHead() {}\nuseHead({ title: 'x' })`],
      ['a parameter', `${IMPORTS}function setup(useHead) { useHead({ title: 'x' }) }`],
      ['a local in an inner scope', `${IMPORTS}{ const useHead = () => {}; useHead({ title: 'x' }) }`],
      ['another package', `import { useHead } from 'other'\nuseHead({ title: 'x' })`],
      ['the unhead core', `import { useHead } from 'unhead'\nuseHead(head, { title: 'x' })`],
      ['useHeadSafe', `import { useHeadSafe } from '@unhead/vue'\nuseHeadSafe({ title: 'x' })`],
      ['a local injectHead beside an auto import', `const injectHead = () => null\nuseHead({ title: 'x' })`],
      ['an injectHead of another package beside an auto import', `import { injectHead } from 'other'\nuseHead({ title: 'x' })`],
    ])('when the callee is %s', (_, code) => {
      expect(transform(code)).toBeUndefined()
    })

    it('when the source does not parse', () => {
      expect(transform(`${IMPORTS}useHead({ title: `)).toBeUndefined()
    })
  })
})

describe('compile option', () => {
  const vue = { framework: '@unhead/vue' }
  const base = { devtools: false, validate: false, transformInlineScripts: false } as const

  async function pipeline(plugins: any[], code: string, id: string, ctx: any) {
    for (const plugin of plugins) {
      if (!plugin.transform || plugin.apply === 'serve')
        continue
      const result = await runTransform(plugin, code, id, ctx)
      code = result?.code ?? code
    }
    return code
  }

  it('adds nothing when off, so builds stay as they are today', () => {
    const today = ['unhead:remove-server-composables', 'unhead:use-seo-meta-transform', 'unhead:ssr-static-replace', '@unhead/create-head-transform']
    expect(Unhead(base, vue).map(plugin => plugin.name)).toEqual(today)
    expect(Unhead({ ...base, compile: false }, vue).map(plugin => plugin.name)).toEqual(today)
    expect(Unhead({ ...base, compile: true }, { framework: '@unhead/react' }).map(plugin => plugin.name)).toEqual(today)
    expect(Unhead({ ...base, compile: true }).map(plugin => plugin.name)).toEqual(today)
  })

  it('flows through the @unhead/vue bundler factory to every bundler', () => {
    const streamingPlugin = { vite: () => [], webpack: () => [], rspack: () => [], rollup: () => [] } as any
    const UnheadVue = createFrameworkPlugin({ framework: '@unhead/vue', streamingPlugin })
    const options = { devtools: false, validate: false } as const
    expect(UnheadVue({ ...options, compile: true }).vite().map(plugin => plugin.name)).toContain('unhead:compile-transform')
    expect(UnheadVue(options).vite().map(plugin => plugin.name)).not.toContain('unhead:compile-transform')
    for (const bundler of ['webpack', 'rspack', 'rollup'] as const)
      expect(UnheadVue({ ...options, compile: true })[bundler]()).toHaveLength(UnheadVue(options)[bundler]().length + 1)
    const UnheadReact = createFrameworkPlugin({ framework: '@unhead/react', streamingPlugin })
    expect(UnheadReact({ ...options, compile: true }).vite().map(plugin => plugin.name)).not.toContain('unhead:compile-transform')
  })

  it('leaves client builds byte-identical when on', async () => {
    const code = `${IMPORTS}useHead({ title: 'A' })\nuseSeoMeta({ description: 'B' })\nuseServerHead({ title: 'C' })`
    const client = { environment: { config: { consumer: 'client' } } }
    const output = await pipeline(Unhead({ ...base, compile: true }, vue), code, '/src/page.js', client)
    expect(output).toBe(await pipeline(Unhead(base, vue), code, '/src/page.js', client))
    expect(calls(output).map(call => call.fn)).toEqual(['useHead', 'useHead'])
  })

  it('passes the compile options to the transform', async () => {
    const code = `useHead({ title: 'A' })`
    expect(await pipeline(Unhead({ ...base, compile: true }, vue), code, '/src/page.js', server)).toBe(code)
    const compile = { autoImports: ['useHead'] }
    const compiled = await pipeline(Unhead({ ...base, compile }, vue), code, '/src/page.js', server)
    expect(calls(compiled, { injectHead: () => null }).map(call => call.fn)).toEqual(['useCompiledHead'])
    // the bundler factory builds the transform on its own
    const UnheadVue = createFrameworkPlugin({ framework: '@unhead/vue', streamingPlugin: { vite: () => [] } as any })
    expect(await pipeline(UnheadVue({ ...base, compile }).vite(), code, '/src/page.js', server)).toBe(compiled)
  })

  // a build without compile renders the `useHead` call that the transform writes
  it('runs after the useSeoMeta transform and minify', async () => {
    const minify = async (code: string) => code.replace(/\s+/g, '')
    const plugins = Unhead({ ...base, compile: true, minify: { js: minify } }, vue)
    expect(plugins.map(plugin => plugin.name).slice(0, 4))
      .toEqual(['unhead:remove-server-composables', 'unhead:use-seo-meta-transform', 'unhead:minify-transform', 'unhead:compile-transform'])
    const code = await pipeline(plugins, `${IMPORTS}useHead({ script: [{ innerHTML: 'var value = 1 ; var other = 2 ;' }] })\nuseSeoMeta({ description: 'x' }, { nuxt })\nuseSeoMeta({ title: 'T' })`, '/src/page.js', server)
    // each call the useSeoMeta transform rewrites carries the marker that `readEntry` reports
    expect(calls(code, { nuxt: 'nuxt' })).toEqual([
      { fn: 'useCompiledHead', args: [compiledTagsOf({ script: [{ innerHTML: 'varvalue=1;varother=2;' }] })] },
      { fn: 'useHead', args: [{ meta: [{ name: 'description', content: 'x' }] }, { nuxt: 'nuxt', seoMeta: true }] },
      { fn: 'useCompiledHead', args: [compiledTagsOf({ title: 'T' }), undefined, { seoMeta: true }] },
    ])
  })

  it('marks no call of a build without compile', async () => {
    const code = `${IMPORTS}useSeoMeta({ title: 'T' })`
    const output = await pipeline(Unhead(base, vue), code, '/src/page.js', server)
    expect(calls(output)).toEqual([{ fn: 'useHead', args: [{ title: 'T' }] }])
  })
})
