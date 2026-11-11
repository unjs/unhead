// @vitest-environment jsdom
import * as unheadVue from '@unhead/vue'
import { createHead as createClientHead } from '@unhead/vue/client'
import * as compiledRuntime from '@unhead/vue/compiled'
import { createHead as createV3, renderSSRHead } from '@unhead/vue/server'
import { renderToString } from '@vue/server-renderer'
import { JSDOM } from 'jsdom'
import { TemplateParamsPlugin } from 'unhead/plugins'
import { describe, expect, it, vi } from 'vitest'
import * as vue from 'vue'
import { CompileTransform } from '../../../bundler/src/unplugin/CompileTransform'
import { createLazyHead } from '../../src/lazy'

const IMPORT_RE = /^import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"];?$/gm
const AS_RE = /\s+as\s+/
const COMPILED_CALL_RE = /__unhead_(?:useCompiledHead|useCompiledSeoMeta|useStaticCompiledSeoMeta)\(/g

const modules = {
  '@unhead/vue': unheadVue,
  '@unhead/vue/compiled': compiledRuntime,
  'vue': vue,
} satisfies Record<string, object>

function compile(source: string): string {
  const plugin = CompileTransform.vite({}) as any
  return plugin.transform.handler.call({ environment: { config: { consumer: 'client' } } }, source, '/src/page.js')?.code ?? source
}

// Evaluates a module whose default export is a setup function. Named imports
// resolve to the real modules.
function evaluate(code: string, globals: Record<string, unknown>): () => void {
  const body = code.replace(IMPORT_RE, (_, specifiers: string, source: string) => {
    const bindings = specifiers.split(',').map(s => s.trim()).filter(Boolean).map((specifier) => {
      const [imported, local = imported] = specifier.split(AS_RE)
      return `${imported}: ${local}`
    })
    return `const { ${bindings.join(', ')} } = __modules[${JSON.stringify(source)}];`
  }).replace('export default', '__exports.default =')
  const exports: Record<string, any> = {}
  // eslint-disable-next-line no-new-func
  new Function('__modules', '__exports', ...Object.keys(globals), body)(modules, exports, ...Object.values(globals))
  return exports.default
}

const tick = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms))

async function settle(head: { dirty: boolean }) {
  for (let i = 0; i < 4; i++)
    await tick()
  for (let i = 0; head.dirty && i < 200; i++)
    await tick(5)
}

const LAYOUT = `useHead({ title: 'Layout', titleTemplate: '%s %separator %siteName', templateParams: { siteName: 'Site' }, meta: [{ name: 'description', content: 'layout' }, { property: 'og:title', content: 'layout' }], link: [{ rel: 'canonical', href: '/layout' }], htmlAttrs: { lang: 'en' } })
  useSeoMeta({ ogDescription: 'layout', twitterTitle: 'layout' })`

function snippet(call: string): string {
  return `import { useHead, useSeoMeta } from '@unhead/vue'
import { computed, ref } from 'vue'
export default function setup() {
  ${LAYOUT}
  ${call}
}`
}

// Renders the loose source on a v3 server head, then hydrates the same page twice: with
// the loose source on a v3 client head, and with the compiled source on a lazy head.
async function hydrateBoth(source: string, tp: boolean, initial: unknown) {
  const plugins = tp ? [TemplateParamsPlugin] : []
  const server = createV3({ plugins })
  const ssrApp = vue.createSSRApp({ setup: evaluate(source, { value: vue.ref(initial) }), render: () => null })
  ssrApp.use(server)
  const html = await renderToString(ssrApp)
  const { headTags, htmlAttrs, bodyAttrs, bodyTagsOpen, bodyTags } = renderSSRHead(server)
  const page = () => new JSDOM(`<!DOCTYPE html><html${htmlAttrs}><head>${headTags}</head><body${bodyAttrs}>${bodyTagsOpen}<div id="app">${html}</div>${bodyTags}</body></html>`)
  const v3Dom = page()
  const compiledDom = page()
  const v3Value = vue.ref(initial)
  const compiledValue = vue.ref(initial)
  const v3 = createClientHead({ document: v3Dom.window.document, plugins })
  vue.createSSRApp({ setup: evaluate(source, { value: v3Value }), render: () => null }).use(v3).mount(v3Dom.window.document.getElementById('app')!)
  const lazy = createLazyHead({ document: compiledDom.window.document, plugins })
  vue.createSSRApp({ setup: evaluate(compile(source), { value: compiledValue }), render: () => null }).use(lazy).mount(compiledDom.window.document.getElementById('app')!)
  lazy.render()
  await lazy.load()
  await settle(lazy)
  return {
    v3Dom,
    compiledDom,
    // the full runtime turns every compiled entry back into loose input when it loads
    onCompiledRuntime: () => [...lazy.entries.values()].every(entry => Array.isArray(entry._pending ?? entry.input)),
    async set(next: unknown) {
      v3Value.value = next
      compiledValue.value = next
      await vue.nextTick()
      await settle(lazy)
    },
  }
}

const RUNTIME_VALUES: [string, unknown][] = [
  ['text', 'Hello'],
  ['text with markup', 'a < b & "c"'],
  ['template param', '%siteName page'],
  ['empty', ''],
  ['true text', 'true'],
  ['zero', 0],
  ['number', 42],
  ['null', null],
  ['undefined', undefined],
  ['false', false],
  ['list', ['a', 'b']],
]

const WRAPPERS: [string, string][] = [
  ['ref', 'value'],
  ['getter', '() => value.value'],
  ['computed', 'computed(() => value.value)'],
  // v3 unwraps a ref that a getter returns
  ['getter of a ref', '() => value'],
]

// The runtime values that keep a head call on the compiled runtime
const HEAD_COMPILED = new Set(['text', 'text with markup', 'template param', 'empty', 'true text', 'zero', 'number', 'null', 'undefined', 'false'])
const SEO_COMPILED = new Set(['text', 'text with markup', 'template param', 'zero', 'number', 'undefined'])
const SEO_STRING_COMPILED = new Set(['text', 'text with markup', 'template param'])
const SEO_URL_COMPILED = new Set(['text', 'text with markup', 'template param', 'zero', 'number'])
// v3 throws while it renders `undefined` or `null` in a flat meta list
const THROWS_IN_LIST = new Set(['undefined', 'null'])

const POSITIONS: [string, (value: string) => string, Set<string>, Set<string>?][] = [
  ['useHead title', value => `useHead({ title: ${value} })`, HEAD_COMPILED],
  ['useHead meta content', value => `useHead({ meta: [{ name: 'description', content: ${value} }] })`, HEAD_COMPILED],
  ['useHead link href', value => `useHead({ link: [{ rel: 'canonical', href: ${value} }] })`, HEAD_COMPILED],
  ['useHead html lang', value => `useHead({ htmlAttrs: { lang: ${value} } })`, HEAD_COMPILED],
  ['useHead mixed', value => `useHead({ title: 'Static', meta: [{ property: 'og:title', content: ${value} }, { name: 'robots', content: 'index' }] })`, HEAD_COMPILED],
  ['useHead getter input', value => `useHead(() => ({ title: ${value}, meta: [{ name: 'description', content: ${value} }, { name: 'robots', content: 'index' }] }))`, HEAD_COMPILED],
  ['useHead getter input with statements', value => `useHead(() => {
    const read = ${value}
    return { title: read, link: [{ rel: 'canonical', href: read }] }
  })`, HEAD_COMPILED],
  ['useSeoMeta description', value => `useSeoMeta({ description: ${value}, ogType: 'website' })`, SEO_COMPILED],
  ['useSeoMeta og title', value => `useSeoMeta({ ogTitle: ${value}, twitterTitle: ${value} })`, SEO_COMPILED],
  ['useSeoMeta string list', value => `useSeoMeta({ articleTag: [${value}, 'static'], ogType: 'article' })`, SEO_STRING_COMPILED, THROWS_IN_LIST],
  ['useSeoMeta image list', value => `useSeoMeta({ ogImage: [{ url: ${value}, width: 1200 }, '/static.png'] })`, SEO_URL_COMPILED],
]

describe('client-compiled head calls hydrate and update like v3', () => {
  const cases = POSITIONS.flatMap(([position, call, compiled, skip]) => WRAPPERS.flatMap(([wrapper, expression]) =>
    RUNTIME_VALUES.filter(([name]) => !skip?.has(name)).map(([name, value]) => [`${position}, ${wrapper} ${name}`, call(expression), value, compiled.has(name), !!skip] as const)))

  it.each(cases)('%s', async (_, call, value, compiled, throwsOnNull) => {
    const source = snippet(call)
    // both layout calls and the call under test compile, with a value
    expect(compile(source).match(COMPILED_CALL_RE)!.length).toBe(3)
    for (const tp of [false, true]) {
      const pair = await hydrateBoth(source, tp, value)
      expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
      // the full runtime chunk may still download
      await vi.waitFor(() => expect(pair.onCompiledRuntime()).toBe(compiled))
      for (const next of ['Changed', '', value, 7, ...throwsOnNull ? [] : [null]]) {
        await pair.set(next)
        expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
      }
    }
  }, 30_000)
})

// A conditional whose branches each have a static shape, as a docs page returns its canonical link
const BRANCH_POSITIONS: [string, string, (name: string) => boolean][] = [
  ['a getter that returns a conditional', `useHead(() => {
    const read = value.value
    return read ? { link: [{ rel: 'canonical', href: read }] } : {}
  })`, name => HEAD_COMPILED.has(name)],
  // the value only picks the branch, so every value stays on the compiled runtime
  ['a conditional key of a getter', `useHead(() => ({ link: value.value ? [{ rel: 'canonical', href: '/a' }] : [], title: 'T' }))`, () => true],
]

describe('client-compiled conditional head calls hydrate and update like v3', () => {
  const cases = BRANCH_POSITIONS.flatMap(([position, call, compiled]) => RUNTIME_VALUES.map(([name, value]) => [`${position}, ${name}`, call, value, compiled(name)] as const))

  it.each(cases)('%s', async (_, call, value, compiled) => {
    const source = snippet(call)
    expect(compile(source).match(COMPILED_CALL_RE)!.length).toBe(3)
    for (const tp of [false, true]) {
      const pair = await hydrateBoth(source, tp, value)
      expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
      await vi.waitFor(() => expect(pair.onCompiledRuntime()).toBe(compiled))
      // each change may pick the other branch
      for (const next of ['Changed', '', value, 7, null, 'Last']) {
        await pair.set(next)
        expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
      }
    }
  }, 30_000)
})

describe('a v3 client head with compile on', () => {
  it('throws at the first compiled call and names the fix', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="app"></div></body></html>')
    const head = createClientHead({ document: dom.window.document })
    const errors: string[] = []
    const app = vue.createApp({ setup: evaluate(compile(snippet('')), {}), render: () => null }).use(head)
    app.config.errorHandler = error => errors.push((error as Error).message)
    app.mount(dom.window.document.getElementById('app')!)
    expect(errors).toEqual(['[unhead] This head cannot take compiled tags. Create it with createHead() from @unhead/vue/compiled/server or createLazyHead() from @unhead/vue/lazy. Or set compile: false in the Unhead plugin.'])
  })
})
