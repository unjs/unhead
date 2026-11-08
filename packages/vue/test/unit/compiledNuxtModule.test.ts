// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as unheadVue from '@unhead/vue'
import { createHead as createClientHead } from '@unhead/vue/client'
import * as compiledRuntime from '@unhead/vue/compiled'
import { createHead as createCompiled, renderSSRHead as renderCompiled } from '@unhead/vue/compiled/server'
import { createHead as createV3, renderSSRHead as renderV3 } from '@unhead/vue/server'
import { renderToString } from '@vue/server-renderer'
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import * as vue from 'vue'
import { CompileTransform } from '../../../bundler/src/unplugin/CompileTransform'
import { createLazyHead } from '../../src/lazy'

// The Nuxt UI 4.11.3 plugin that sets its color variables, as published
const COLORS_ID = '/app/node_modules/.pnpm/@nuxt+ui@4.11.3/node_modules/@nuxt/ui/dist/runtime/plugins/colors.js'
const COLORS_SOURCE = readFileSync(resolve(__dirname, '../fixtures/nuxt-ui/colors.js'), 'utf8')
  // Nuxt defines this at build time
  .replace('import.meta.client', 'false')

const IMPORT_RE = /^import\s+(?:\{([^}]*)\}|(\w+))\s+from\s*['"]([^'"]+)['"];?$/gm
const AS_RE = /\s+as\s+/

function compile(source: string): string | undefined {
  const plugin = CompileTransform.vite({}) as any
  return plugin.transform.handler.call({}, source, COLORS_ID)?.code
}

// Evaluates the plugin module with Nuxt's `#imports` bound to `@unhead/vue` and an app config
function evaluate(code: string, appConfig: object): () => void {
  const modules: Record<string, any> = {
    'vue': vue,
    '@unhead/vue/compiled': compiledRuntime,
    'tailwindcss/colors': { default: { green: { 500: '#0f0', 400: '#0e0' }, slate: { 500: '#555', 400: '#444' } } },
    '#imports': {
      defineNuxtPlugin: (setup: () => void) => setup,
      injectHead: unheadVue.injectHead,
      useHead: unheadVue.useHead,
      useAppConfig: () => appConfig,
      useNuxtApp: () => ({ isHydrating: true, payload: { serverRendered: true } }),
    },
  }
  const body = code.replace(IMPORT_RE, (_, named: string | undefined, fallback: string | undefined, source: string) => {
    if (fallback)
      return `const ${fallback} = __modules[${JSON.stringify(source)}].default;`
    const bindings = named!.split(',').map(s => s.trim()).filter(Boolean).map((specifier) => {
      const [imported, local = imported] = specifier.split(AS_RE)
      return `${imported}: ${local}`
    })
    return `const { ${bindings.join(', ')} } = __modules[${JSON.stringify(source)}];`
  }).replace('export default', 'return')
  // eslint-disable-next-line no-new-func
  return new Function('__modules', body)(modules)
}

function appConfigOf() {
  return vue.reactive({ ui: { prefix: '', colors: { primary: 'green', neutral: 'slate' } } })
}

// Nuxt runs a plugin in the app context, before the app renders
function runPlugin(app: vue.App, plugin: () => void) {
  vue.effectScope().run(() => app.runWithContext(plugin))
}

const tick = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms))

describe('the Nuxt UI colors plugin', () => {
  it('compiles through the transform', () => {
    expect(compile(COLORS_SOURCE)).toContain('__unhead_useCompiledHead(')
  })

  it('renders the same server head as v3', async () => {
    const render = async (head: any, code: string) => {
      const app = vue.createSSRApp({ render: () => null }).use(head)
      runPlugin(app, evaluate(code, appConfigOf()))
      await renderToString(app)
    }
    const v3 = createV3()
    await render(v3, COLORS_SOURCE)
    const compiled = createCompiled()
    await render(compiled, compile(COLORS_SOURCE)!)
    expect(renderCompiled(compiled)).toEqual(renderV3(v3))
    expect(renderV3(v3).headTags).toContain('id="nuxt-ui-colors"')
  })

  it('hydrates on the compiled runtime and changes colors like v3', async () => {
    const server = createV3()
    const ssrApp = vue.createSSRApp({ render: () => vue.h('div') }).use(server)
    runPlugin(ssrApp, evaluate(COLORS_SOURCE, appConfigOf()))
    const html = await renderToString(ssrApp)
    const { headTags, htmlAttrs } = renderV3(server)
    const page = () => new JSDOM(`<!DOCTYPE html><html${htmlAttrs}><head>${headTags}</head><body><div id="app">${html}</div></body></html>`)

    const v3Dom = page()
    const v3Config = appConfigOf()
    const v3 = createClientHead({ document: v3Dom.window.document })
    const v3App = vue.createSSRApp({ render: () => vue.h('div') }).use(v3)
    runPlugin(v3App, evaluate(COLORS_SOURCE, v3Config))
    v3App.mount(v3Dom.window.document.getElementById('app')!)

    const compiledDom = page()
    const compiledConfig = appConfigOf()
    const lazy = createLazyHead({ document: compiledDom.window.document })
    const compiledApp = vue.createSSRApp({ render: () => vue.h('div') }).use(lazy)
    runPlugin(compiledApp, evaluate(compile(COLORS_SOURCE)!, compiledConfig))
    compiledApp.mount(compiledDom.window.document.getElementById('app')!)
    lazy.render()
    // every entry holds compiled tags, so the compiled runtime loads
    expect(lazy._acceptsCompiled?.()).toBeDefined()
    await lazy.load()
    await tick(20)
    expect(compiledDom.serialize()).toBe(v3Dom.serialize())
    expect((lazy.resolvedOptions as any)._tagWeight).toBeUndefined()

    v3Config.ui.colors.primary = 'slate'
    compiledConfig.ui.colors.primary = 'slate'
    await vue.nextTick()
    await tick(20)
    expect(compiledDom.serialize()).toBe(v3Dom.serialize())
    expect(compiledDom.serialize()).toContain('--ui-color-primary-500: var(--color-slate-500, #555)')
    // a full runtime sets the tag weight when it loads
    expect((lazy.resolvedOptions as any)._tagWeight).toBeUndefined()
  })
})
