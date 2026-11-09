import * as unheadVue from '@unhead/vue'
import * as compiledRuntime from '@unhead/vue/compiled'
import { createHead as createCompiled, renderSSRHead as renderCompiled } from '@unhead/vue/compiled/server'
import { createHead as createV3, renderSSRHead as renderV3 } from '@unhead/vue/server'
import { renderToString } from '@vue/server-renderer'
import { describe, expect, it } from 'vitest'
import * as vue from 'vue'
import { Unhead } from '../../src/vite'

// Head calls taken from real sites, run through the `@unhead/vue/vite` plugin with compiler
// mode off and on, as a Nuxt build runs them.

const IMPORT_RE = /^import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"];?$/gm
const AS_RE = /\s+as\s+/

const modules = {
  '@unhead/vue': unheadVue,
  // Nuxt re-exports the `@unhead/vue` composables from these paths
  'nuxt/app': unheadVue,
  '#imports': unheadVue,
  '@unhead/vue/compiled': compiledRuntime,
  'vue': vue,
} satisfies Record<string, object>

// The transforms of the bundler plugin, in order, as Vite runs them on one module
async function build(source: string, compile: boolean, id = '/app/pages/page.js'): Promise<string> {
  const plugins = Unhead({ compile, devtools: false, validate: false, treeshake: false, minify: false }) as any[]
  let code = source
  for (const plugin of plugins) {
    const transform = plugin.transform
    if (!transform || (plugin.apply && typeof plugin.apply === 'function' && !plugin.apply({}, { command: 'build' })))
      continue
    const handler = typeof transform === 'function' ? transform : transform.handler
    const filter = typeof transform === 'object' ? transform.filter?.code : undefined
    const codeFilters = filter ? [filter.include ?? filter].flat() : []
    if (codeFilters.length && !codeFilters.some((re: RegExp) => re.test(code)))
      continue
    const result = await handler.call({ environment: { name: 'ssr', config: { consumer: 'server' } }, warn() {} }, code, id)
    if (result)
      code = typeof result === 'string' ? result : result.code
  }
  return code
}

function evaluate(code: string, globals: Record<string, unknown>): () => void {
  const imported = new Set<string>()
  const body = code.replace(IMPORT_RE, (_, specifiers: string, source: string) => {
    const bindings = specifiers.split(',').map(s => s.trim()).filter(Boolean).map((specifier) => {
      const [name, local = name] = specifier.split(AS_RE)
      imported.add(local!)
      return `${name}: ${local}`
    })
    return `const { ${bindings.join(', ')} } = __modules[${JSON.stringify(source)}];`
  }).replace('export default', '__exports.default =')
  globals = Object.fromEntries(Object.entries(globals).filter(([name]) => !imported.has(name)))
  const exports: Record<string, any> = {}
  // eslint-disable-next-line no-new-func
  new Function('__modules', '__exports', ...Object.keys(globals), body)(modules, exports, ...Object.values(globals))
  return exports.default
}

// Auto imports, as Nuxt leaves them to a later transform
const autoImports = { useHead: unheadVue.useHead, useSeoMeta: unheadVue.useSeoMeta, injectHead: unheadVue.injectHead, computed: vue.computed }

async function render(source: string, compile: boolean, globals: Record<string, unknown>) {
  const head: any = compile ? createCompiled() : createV3()
  const code = await build(source, compile)
  const app = vue.createSSRApp({ setup: () => evaluate(code, { ...autoImports, ...globals })(), render: () => null })
  app.use(head)
  await renderToString(app)
  return { head, code, payload: compile ? renderCompiled(head) : renderV3(head) }
}

// `app/pages/learn-lighthouse/[...slug].vue` of unlighthouse.dev
const UNLIGHTHOUSE_ARTICLE = `export default function setup() {
  useSeoMeta({
    title: () => page.value?.title || '',
    description: () => page.value?.description,
  })
  const articlePublishedTime = computed(() => page.value?.publishedAt ? \`\${page.value.publishedAt}T12:00:00Z\` : undefined)
  const articleModifiedTime = computed(() => page.value?.updatedAt ? \`\${page.value.updatedAt}T12:00:00Z\` : undefined)
  useSeoMeta({
    ogType: 'article',
    author: 'Harlan Wilton',
    articleAuthor: ['Harlan Wilton'],
    articleSection: 'Lighthouse Tutorials',
    articleTag: page.value?.keywords,
    articlePublishedTime,
    articleModifiedTime,
    twitterData1: 'Harlan Wilton',
    twitterLabel1: 'Author',
    twitterData2: page.value?.readTime === undefined ? undefined : String(page.value.readTime),
    twitterLabel2: 'Read Time',
  })
}`

const LCP_PAGE = {
  title: 'Largest Contentful Paint (LCP)',
  description: 'A good LCP score is 2.5 seconds or less.',
  keywords: ['largest contentful paint', 'what is lcp', 'good lcp score'],
  publishedAt: '2025-01-18',
  updatedAt: '2026-10-04',
  readTime: '6 min',
}

describe('compiled useSeoMeta renders as compiler mode off does', () => {
  it.each([
    ['an article with keywords', LCP_PAGE],
    ['an article with no keywords', { ...LCP_PAGE, keywords: undefined }],
  ])('unlighthouse learn article: %s', async (_, page) => {
    const globals = { page: vue.ref(page) }
    const off = await render(UNLIGHTHOUSE_ARTICLE, false, globals)
    const on = await render(UNLIGHTHOUSE_ARTICLE, true, globals)
    expect(on.code).toContain('useCompiledHead')
    expect(on.payload).toEqual(off.payload)
  })

  it('keeps runtime order for a call the stock transform leaves', async () => {
    // an import path the stock transform does not rewrite
    const source = `import { useSeoMeta } from 'nuxt/app'
export default function setup() {
  useSeoMeta({ ogType: 'article', articleTag: tags, articleAuthor: ['A'], author: 'A' })
}`
    const globals = { tags: ['one', 'two'] }
    const off = await render(source, false, globals)
    const on = await render(source, true, globals)
    expect(off.code).toContain('useSeoMeta(')
    expect(on.payload).toEqual(off.payload)
  })

  // `layers/registry/app/pages/gh/[owner]/index.vue` of skilld.dev, for an owner with no data
  it('skilld owner page: an empty og:description getter', async () => {
    const source = `export default function setup() {
  useSeoMeta({
    title: () => data.value ? data.value.displayName : '@' + ownerParam.value,
    description: () => 'Agent skills published by @' + ownerParam.value + ' on skilld.',
    ogTitle: () => data.value?.displayName ? data.value.displayName + ' on skilld' : '@' + ownerParam.value + ' on skilld',
    ogDescription: () => {
      if (!data.value)
        return ''
      return data.value.totalSkills + ' agent skills'
    },
    ogUrl: canonicalUrl,
    robots: 'noindex, follow',
    twitterCard: 'summary_large_image',
  })
}`
    const globals = { data: vue.ref(null), ownerParam: vue.ref('antfu'), canonicalUrl: vue.computed(() => 'https://skilld.dev/gh/antfu') }
    const off = await render(source, false, globals)
    const on = await render(source, true, globals)
    expect(off.payload.headTags).not.toContain('og:description')
    expect(on.payload).toEqual(off.payload)
  })
})
