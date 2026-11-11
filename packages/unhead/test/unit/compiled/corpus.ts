import type { CreateServerHeadOptions, HeadEntryOptions, RenderSSRHeadOptions } from '../../../src/types'
import { dynamicValue } from '../../../src/compiled/tags'

export interface ScenarioEntry {
  input: any
  options?: HeadEntryOptions
  dispose?: boolean
  patch?: any
  /** The input with `dynamicValue(i)` for `values[i]`. A compiled head pushes it as compiled tags with values. */
  template?: any
  values?: unknown[]
}

export interface Scenario {
  name: string
  entries: ScenarioEntry[]
  head?: Partial<CreateServerHeadOptions>
  render?: RenderSSRHeadOptions
}

function entries(name: string, ...inputs: any[]): Scenario {
  return { name, entries: inputs.map(input => ({ input })) }
}

// `build` gets an argument for each value: a dynamic value token for the compiled tags, the value itself for the input
function withValues(build: (...values: unknown[]) => any, values: unknown[], options?: HeadEntryOptions): ScenarioEntry {
  return { input: build(...values), template: build(...values.map((_, i) => dynamicValue(i))), values, options }
}

// Nuxt's renderer on the normal non-streaming path, main and 4.6.4. See bench/compiled-nuxt-route-fixtures.mjs
const nuxtAppHead = {
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }, { charset: 'utf-8' }],
  link: [],
  style: [],
  script: [],
  noscript: [],
  charset: 'utf-8',
  viewport: 'width=device-width, initial-scale=1',
  titleTemplate: '%s %separator %siteName',
  templateParams: { siteName: 'E2E Site', separator: '|' },
}
// what a Nuxt patch compiles: v3 drops the two unknown tags at render, and compile refuses them
const { charset: _charset, viewport: _viewport, ...nuxtAppHeadTagsInput } = nuxtAppHead
const nuxtStylesheets = { link: [{ rel: 'stylesheet', href: '/_nuxt/entry.qZqG9Fkf.css', crossorigin: '' }, { rel: 'stylesheet', href: '/_nuxt/index.B1x.css', crossorigin: '' }] }
const nuxtHints = {
  link: [
    { rel: 'modulepreload', as: 'script', type: null, crossorigin: '', href: '/_nuxt/BQR-mvRI.js' },
    { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href: '/_nuxt/inter.woff2' },
    { rel: 'preload', as: 'image', type: null, crossorigin: null, href: '/_nuxt/hero.webp' },
    { rel: 'prefetch', as: 'script', type: null, crossorigin: '', href: '/_nuxt/DJbzmi7I.js' },
    { rel: 'prefetch', as: 'style', type: null, crossorigin: '', href: '/_nuxt/lazy.css' },
  ],
}
const nuxtEntryScripts = { script: [{ type: 'module', src: '/_nuxt/Dq3kTz9f.js', defer: null, tagPosition: 'head', crossorigin: '' }] }
const nuxtConfigScript = 'window.__NUXT__={};window.__NUXT__.config={public:{},app:{baseURL:"/",buildId:"b",buildAssetsDir:"/_nuxt/",cdnURL:""}}'
const nuxtPayloadOptions: HeadEntryOptions = { tagPosition: 'bodyClose', tagPriority: 'high' }
function nuxtPayload(contents: unknown, extra: Record<string, unknown> = {}) {
  return {
    script: [
      { 'type': 'application/json', 'innerHTML': contents, 'data-nuxt-data': 'nuxt-app', 'data-ssr': true, 'id': '__NUXT_DATA__', ...extra },
      { innerHTML: nuxtConfigScript },
    ],
  }
}
// the payload as a Nuxt patch compiles it: one script with a value and the entry options inside
function nuxtPayloadTags(contents: unknown, extra: Record<string, unknown> = {}) {
  return {
    script: [{ 'type': 'application/json', 'data-nuxt-data': 'nuxt-app', 'data-ssr': true, 'id': '__NUXT_DATA__', ...extra, 'innerHTML': contents, 'tagPosition': 'bodyClose', 'tagPriority': 'high' }],
  }
}
const nuxtConfigTags = { script: [{ innerHTML: nuxtConfigScript, tagPosition: 'bodyClose', tagPriority: 'high' }] }
const nuxtPayloadTexts = [
  '[["ShallowReactive",1],{"data":2},{"slug":"\\u002Fposts\\u002Fa"}]',
  '[{"html":"</script><script>alert(1)</script>","b":"<b>","s":"</SCRIPT"}]',
  '[{"t":"é ✓ \u2028 \uD83D\uDE00 \uE000"},"%s %siteName 100% \\u003C"]',
  ' [{"pad":true}] ',
]

// Inputs come from the scenarios in test/unit/{server,plugins,e2e}. Every one runs
// through the compiled head with compiled tags, loose input, and a mix of both.
export const corpus: Scenario[] = [
  // dedupe
  entries('dedupe: meta by name, later entry wins', { meta: [{ name: 'description', content: 'a' }] }, { meta: [{ name: 'description', content: 'b' }] }),
  entries('dedupe: empty content removes an earlier tag', { meta: [{ name: 'description', content: 'a' }] }, { meta: [{ name: 'description', content: '' }] }),
  entries('dedupe: empty title removes an earlier title', { title: 'a' }, { title: '' }),
  entries('dedupe: null title removes an earlier title', { title: 'a' }, { title: null }),
  entries('dedupe: key allows repeats', { meta: [{ name: 'a', content: '1', key: 'x' }, { name: 'a', content: '2', key: 'y' }] }),
  entries('dedupe: same key merges', { link: [{ rel: 'preload', href: '/a', key: 'k', as: 'script' }] }, { link: [{ rel: 'preload', href: '/b', key: 'k', crossorigin: '' }] }),
  entries('dedupe: script by key', { script: [{ key: 'k', src: '/a.js' }, { key: 'k', src: '/b.js' }] }),
  entries('dedupe: script by id', { script: [{ id: 'a', src: '/a.js' }] }, { script: [{ id: 'a', src: '/b.js' }] }),
  entries('dedupe: canonical beats key', { link: [{ rel: 'canonical', href: '/a', key: 'k' }] }, { link: [{ rel: 'canonical', href: '/b' }] }),
  entries('dedupe: alternate by hreflang', { link: [{ rel: 'alternate', hreflang: 'en', href: '/en' }, { rel: 'alternate', hreflang: 'fr', href: '/fr' }] }, { link: [{ rel: 'alternate', hreflang: 'en', href: '/en2' }] }),
  entries('dedupe: identical links', { link: [{ rel: 'icon', href: '/a' }, { rel: 'icon', href: '/a' }, { rel: 'icon', href: '/b' }] }),
  entries('dedupe: identical inline scripts', { script: ['a()', 'a()', 'b()'] }, { script: ['a()'] }),
  entries('dedupe: charset and base are unique', { meta: [{ charset: 'utf-8' }], base: { href: '/a/' } }, { meta: [{ charset: 'latin1' }], base: { href: '/b/' } }),
  entries('dedupe: keyless meta without identity', { meta: [{ content: 'a' }, { content: 'a' }, { content: 'b' }] }),
  entries('dedupe: tag with no attributes', { meta: [{}], link: [{}], script: [{}] }, { meta: [{}] }),
  entries('dedupe: position of a replaced tag stays put', { meta: [{ name: 'a', content: '1' }, { name: 'b', content: '2' }] }, { meta: [{ name: 'a', content: '3' }] }),
  // arrayable meta
  entries('arrayable: og:image in one entry', { meta: [{ property: 'og:image', content: '/1.png' }, { property: 'og:image', content: '/2.png' }, { name: 'x', content: 'y' }, { property: 'og:image', content: '/3.png' }] }),
  entries('arrayable: content array expands', { meta: [{ property: 'og:image', content: ['/1.png', '/2.png'] }, { name: 'keywords', content: ['a', 'b'] }] }),
  entries('arrayable: later entry replaces', { meta: [{ property: 'og:image', content: '/1.png' }, { property: 'og:image', content: '/2.png' }] }, { meta: [{ property: 'og:image', content: '/3.png' }] }),
  entries('arrayable: og:image children', { meta: [{ property: 'og:image:width', content: '1' }, { property: 'og:image:width', content: '2' }, { property: 'article:tag', content: 'a' }, { property: 'article:tag', content: 'b' }, { name: 'theme-color', content: 'red', media: 'a' }, { name: 'theme-color', content: 'blue', media: 'b' }] }),
  entries('arrayable: key on a colon meta', { meta: [{ property: 'og:image', content: '/1.png', key: 'a' }, { property: 'og:image', content: '/2.png', key: 'b' }] }),
  entries('arrayable: same-entry group merges with key', { meta: [{ property: 'og:image', content: '/1.png', key: 'a' }, { property: 'og:image', content: '/2.png', key: 'a' }] }),
  // tagPriority
  entries('priority: aliases', { script: [{ src: '/a.js', tagPriority: 'low' }, { src: '/b.js', tagPriority: 'high' }, { src: '/c.js', tagPriority: 'critical' }, { src: '/d.js' }] }),
  entries('priority: numbers', { meta: [{ name: 'a', content: '1', tagPriority: 5 }, { name: 'b', content: '2', tagPriority: -100 }], link: [{ rel: 'icon', href: '/a', tagPriority: 0 }] }),
  entries('priority: higher priority wins across entries', { meta: [{ name: 'a', content: 'high', tagPriority: 'high' }] }, { meta: [{ name: 'a', content: 'low' }] }),
  entries('priority: alias strategy string', { script: [{ src: '/a.js', tagPriority: 'before:script:b' }, { src: '/b.js', key: 'b' }] }),
  // tagPosition
  entries('position: all positions', { script: [{ src: '/a.js', tagPosition: 'bodyClose' }, { src: '/b.js', tagPosition: 'bodyOpen' }, { src: '/c.js', tagPosition: 'head' }, { src: '/d.js' }], noscript: [{ innerHTML: '<a>', tagPosition: 'bodyOpen' }, { innerHTML: '<b>', tagPosition: 'bodyOpen' }] }),
  entries('position: unknown position drops output', { script: [{ src: '/a.js', tagPosition: 'nowhere' }] }),
  // capo
  entries('capo: every weight', {
    meta: [{ 'http-equiv': 'content-security-policy', 'content': 'x' }, { charset: 'utf-8' }, { name: 'viewport', content: 'x' }, { name: 'a', content: 'b' }],
    link: [{ rel: 'preconnect', href: '/1' }, { rel: 'stylesheet', href: '/2' }, { rel: 'preload', href: '/3' }, { rel: 'modulepreload', href: '/4' }, { rel: 'prefetch', href: '/5' }, { rel: 'dns-prefetch', href: '/6' }, { rel: 'prerender', href: '/7' }, { rel: 'icon', href: '/8' }],
    script: [{ src: '/s1.js' }, { src: '/s2.js', async: true }, { src: '/s3.js', defer: true }, { src: '/s4.js', type: 'module' }, { type: 'importmap', innerHTML: { imports: {} } }, { type: 'speculationrules', innerHTML: { prerender: [] } }, { innerHTML: 'x()' }, { type: 'application/json', innerHTML: '{}' }, { src: '/s5.js', async: '' }],
    style: ['.a{}', '@import "b.css";'],
    title: 't',
    base: { href: '/' },
  }),
  // titleTemplate
  entries('title: template string', { title: 'a', titleTemplate: '%s - b' }),
  entries('title: template without title', { titleTemplate: '%s - b' }),
  entries('title: template with no placeholder', { title: 'a', titleTemplate: 'fixed' }),
  entries('title: template with two placeholders', { title: 'a', titleTemplate: '%s %s' }),
  entries('title: template reset with null', { title: 'a', titleTemplate: '%s - b' }, { titleTemplate: null }),
  entries('title: template reset with empty', { title: 'a', titleTemplate: '%s - b' }, { titleTemplate: '' }),
  entries('title: replacement patterns in title', { title: '$& $1 $$ $\' $`', titleTemplate: '[%s]' }),
  entries('title: escaping', { title: '</title><script>alert(1)</script>"\'&/', titleTemplate: '<%s>' }),
  entries('title: number', { title: 5, titleTemplate: '%s!' }),
  entries('title: zero', { title: 0, titleTemplate: '%s!' }),
  entries('title: zero with no template', { title: 0 }),
  entries('title: attributes', { title: { 'textContent': 'a', 'data-x': 'y' } }),
  entries('title: inner html object form', { title: { innerHTML: 'a<b' } }),
  entries('title: priority', { title: 'a' }, { title: { textContent: 'b', tagPriority: 'low' } }),
  entries('title: processTemplateParams false', { title: { textContent: '%s %x', processTemplateParams: false }, titleTemplate: '%s %x', templateParams: { x: 'y' } }),
  // templateParams
  entries('params: basic', {
    htmlAttrs: { lang: '%locale' },
    title: 'hello world ":',
    titleTemplate: '%s %separator %siteName',
    meta: [{ name: 'description', content: 'Welcome to %siteName!' }, { property: 'twitter:image', content: 'https://cdn.example.com/some%20image.jpg' }],
    script: [{ type: 'application/json', innerHTML: JSON.stringify({ title: '%s' }), processTemplateParams: true }],
    templateParams: { separator: '|', locale: 'en', siteName: 'My Awesome Site' },
  }),
  entries('params: no separator', { title: 'a', titleTemplate: '%s %separator %b', templateParams: { b: 'c' } }),
  entries('params: separator collapse', { title: '%separator a %separator', titleTemplate: '%separator %s %separator', templateParams: { separator: '-' } }),
  entries('params: across entries merge', { templateParams: { a: '1', b: '2' } }, { templateParams: { b: '3' }, meta: [{ name: 'x', content: '%a %b' }] }),
  entries('params: pageTitle param', { title: 'real', templateParams: { pageTitle: 'fake %a', a: 'x' }, meta: [{ name: 'x', content: '%pageTitle %s' }] }),
  entries('params: dotted', { title: '%site.name', templateParams: { site: { name: 'n', url: '/u' } }, link: [{ rel: 'x', href: '%site.url/a' }] }),
  entries('params: falsy values', { title: '%a %b %c %d', templateParams: { a: 0, b: null, c: false, d: '' } }),
  entries('params: opt in and out', { title: 'x', script: [{ innerHTML: '%s', processTemplateParams: true }, { innerHTML: '%s' }], style: [{ innerHTML: '%s', processTemplateParams: true }], meta: [{ name: 'a', content: '%s', processTemplateParams: false }, { name: 'b', content: '%s' }] }),
  entries('params: json escapes', { title: 'a"b<c\\d', script: [{ type: 'application/ld+json', innerHTML: '{"a":"%s"}', processTemplateParams: true }] }),
  entries('params: encoded percent', { templateParams: { x: 'y' }, meta: [{ name: 'a', content: '100%25 %x %E0%A4%A' }], link: [{ rel: 'x', href: '/a%20b?%x' }] }),
  entries('params: no params at all', { title: '%s %separator %nope', meta: [{ name: 'a', content: '%nope' }] }),
  entries('params: template only', { titleTemplate: '%separator %siteName', templateParams: { siteName: 's' } }),
  entries('params: expansion to empty drops meta', { templateParams: { x: '' }, meta: [{ name: 'a', content: '%x' }] }),
  entries('params: title reprocess', { title: '%a', templateParams: { a: '%b', b: 'c' } }),
  entries('params: title template reprocess', { title: 'x', titleTemplate: '%a', templateParams: { a: '%s!' } }),
  entries('params: meta content with whitespace', { templateParams: { a: ' b ' }, meta: [{ name: 'a', content: '  %a  ' }] }),
  // htmlAttrs and bodyAttrs merge
  entries('attrs: class and style merge', { htmlAttrs: { class: 'a b', style: 'color: red;' }, bodyAttrs: { class: ['x', 'y'], style: ['a:b', 'c:d'] } }, { htmlAttrs: { class: 'b c', style: 'background: green; color: blue' }, bodyAttrs: { class: { z: true, w: false }, style: { e: 'f', g: false } } }),
  entries('attrs: override and strategy', { htmlAttrs: { 'data-layout': 'base', 'lang': 'en' } }, { htmlAttrs: { 'data-page': 'page', 'lang': 'fr', 'tagDuplicateStrategy': 'merge' } }),
  entries('attrs: replace strategy', { htmlAttrs: { 'data-a': '1', 'class': 'a' } }, { htmlAttrs: { 'data-b': '2', 'class': 'b', 'tagDuplicateStrategy': 'replace' } }),
  entries('attrs: booleans and data', { htmlAttrs: { 'data-a': true, 'data-b': false, 'data-c': '', 'data-d': 'true', 'data-e': 0, 'hidden': true, 'draggable': false, 'x': '', 'y': null, 'z': 0 } }),
  entries('attrs: class edge values', { htmlAttrs: { class: '  a   b  ' }, bodyAttrs: { class: '' } }, { bodyAttrs: { class: [] } }),
  entries('attrs: style edge values', { htmlAttrs: { style: 'a:b;;c;:d;e:f:g' }, bodyAttrs: { style: {} } }),
  entries('attrs: empty', { htmlAttrs: {}, bodyAttrs: {} }),
  // scripts and styles
  entries('script: closing tag escape', { script: [{ innerHTML: 'a</script>b</SCRIPT>c' }, { textContent: 'd</script>' }, 'e</script>'] }),
  entries('script: json escape', { script: [{ type: 'application/json', innerHTML: '{"a":"</script>"}' }, { type: 'application/ld+json', innerHTML: { a: '</script><b>' } }, { type: 'importmap', innerHTML: { imports: { a: '<' } } }, { type: 'speculationrules', innerHTML: { a: '<' } }] }),
  entries('script: object content', { script: [{ innerHTML: { a: 1 } }, { textContent: { b: 2 } }, { type: 'text/plain', innerHTML: { c: 3 } }, { type: 'application/json', textContent: { d: '<' } }] }),
  entries('script: number content', { script: [{ innerHTML: 5 }, { type: 'application/json', innerHTML: 6 }, { textContent: 0 }] }),
  entries('style: closing tag escape', { style: [{ innerHTML: 'a</style>b</STYLE>' }, 'c</style>', { textContent: 'd' }] }),
  entries('noscript: closing tag escape', { noscript: [{ innerHTML: '<img></noscript><b>' }, 'x'] }),
  entries('script: both content kinds', { script: [{ innerHTML: 'a', textContent: 'b' }] }),
  // xss and prototype pollution
  entries('xss: attribute quotes', { meta: [{ name: 'a', content: '"><script>alert(1)</script>' }], link: [{ rel: 'x', href: '"onload="alert(1)' }], htmlAttrs: { lang: '"><script>' } }),
  entries('xss: invalid attribute names', { meta: [{ 'name': 'a', 'content': 'b', 'x"y': 'z', 'a b': 'c', '<d': 'e', 'f=': 'g', '': 'h' }], htmlAttrs: { 'x"y': 'z' } }),
  entries('xss: titles and bodies', { title: '</title><script>alert(1)</script>', noscript: ['</noscript><script>alert(1)</script>'] }),
  entries('pollution: json keys', {
    meta: [JSON.parse('{"name":"description","content":"safe","__proto__":{"polluted":true}}'), { name: 'b', content: 'safe', constructor: { prototype: { polluted: true } } }, { name: 'c', content: 'safe', prototype: { polluted: true } }],
    htmlAttrs: JSON.parse('{"lang":"en","__proto__":{"polluted":true}}'),
    templateParams: JSON.parse('{"a":"b","__proto__":{"polluted":true}}'),
    title: 'x %a',
  }, JSON.parse('{"__proto__":{"polluted":true},"title":"y"}')),
  // normalization
  entries('normalize: attribute case', { link: [{ rel: 'alternate', hrefLang: 'en', href: '/a', crossOrigin: 'anonymous' }], meta: [{ 'name': 'a', 'content': 'b', 'data-Foo': 'c', 'HTTP-EQUIV': 'x' }] }),
  entries('normalize: booleans', { script: [{ src: '/a.js', async: true, defer: false, nomodule: '' }], link: [{ rel: 'stylesheet', href: '/a.css', disabled: 'true', crossorigin: '' }], meta: [{ name: 'a', content: 'true' }, { name: 'b', content: true }, { name: 'c', content: false }] }),
  entries('normalize: numbers and null', { meta: [{ name: 'a', content: 0 }, { name: 'b', content: 5 }, { name: 'c', content: null }], link: [{ rel: 'x', href: '/a', sizes: 16, media: null }] }),
  entries('normalize: undefined values', { title: undefined, meta: [{ name: 'a', content: undefined }, { name: 'b', content: 'c', media: undefined }], link: undefined, script: [] }),
  entries('normalize: single object', { meta: { name: 'a', content: 'b' }, link: { rel: 'x', href: '/a' }, script: { src: '/a.js' }, style: { innerHTML: 'x' }, noscript: 'y' }),
  entries('normalize: title and base arrays', { title: ['a', 'b'], base: [{ href: '/a' }, { href: '/b' }], htmlAttrs: [{ lang: 'a' }, { dir: 'b' }] }),
  entries('normalize: unknown tag dropped', { foo: { bar: 'baz' }, unknown: 'x' }),
  entries('normalize: long entry', { meta: Array.from({ length: 40 }, (_, i) => ({ name: `m${i}`, content: `c${i}` })) }),
  entries('normalize: empty entries', {}, { meta: [] }, { title: 'x' }),
  entries('normalize: tag config on meta', { meta: [{ name: 'a', content: 'b', tagPosition: 'bodyClose', tagPriority: 'low', processTemplateParams: false }] }),
  entries('normalize: null config keys', { script: [{ src: '/a.js', tagPosition: null, tagPriority: null, key: null, innerHTML: null }] }),
  // multiple entries
  {
    name: 'entries: dispose',
    entries: [
      { input: { title: 'a', meta: [{ name: 'x', content: '1' }] } },
      { input: { title: 'b', meta: [{ name: 'x', content: '2' }] }, dispose: true },
      { input: { link: [{ rel: 'icon', href: '/a' }] } },
    ],
  },
  {
    name: 'entries: dispose every entry',
    entries: [{ input: { title: 'a' }, dispose: true }, { input: { title: 'b' }, dispose: true }],
  },
  {
    name: 'entries: patch',
    entries: [
      { input: { title: 'a', meta: [{ name: 'x', content: '1' }] }, patch: { title: 'c', link: [{ rel: 'icon', href: '/p' }] } },
      { input: { meta: [{ name: 'x', content: '2' }] } },
    ],
  },
  {
    name: 'entries: patch after dispose keeps the original index',
    entries: [
      { input: { title: 'a' }, dispose: true, patch: { title: 'patched' } },
      { input: { title: 'b' } },
    ],
  },
  {
    name: 'entries: patch to empty',
    entries: [{ input: { title: 'a' }, patch: {} }, { input: { meta: [{ name: 'x', content: '1' }] } }],
  },
  {
    name: 'entries: options',
    entries: [
      { input: { script: [{ src: '/a.js' }], meta: [{ name: 'a', content: '%s' }] }, options: { tagPosition: 'bodyClose' } },
      { input: { script: [{ src: '/b.js' }], title: 'x' }, options: { tagPriority: 'high' } },
      { input: { meta: [{ name: 'b', content: '%s' }] }, options: { processTemplateParams: false } },
      { input: { htmlAttrs: { class: 'a' } } },
      { input: { htmlAttrs: { class: 'b' } }, options: { tagDuplicateStrategy: 'replace' } },
    ],
  },
  {
    name: 'entries: index option',
    entries: [
      { input: { title: 'late', meta: [{ name: 'a', content: 'x' }] }, options: { _index: 50 } },
      { input: { title: 'early', meta: [{ name: 'a', content: 'y' }] } },
      { input: { meta: [{ name: 'a', content: 'zero' }] }, options: { _index: 0 } },
    ],
  },
  // Nuxt renderer
  entries('nuxt: app head as built', nuxtAppHead, { title: 'Page' }),
  entries('nuxt: app head as a patch compiles it', nuxtAppHeadTagsInput, { title: 'Page' }),
  ...nuxtPayloadTexts.map((text, i): Scenario => ({
    name: `nuxt: renderer pushes, main, payload ${i}`,
    render: { omitLineBreaks: true },
    entries: [
      { input: nuxtAppHead },
      { input: { title: 'Page', meta: [{ name: 'description', content: 'About %siteName' }] } },
      { input: { script: [{ tagPosition: 'head', tagPriority: 'critical', type: 'importmap', innerHTML: { imports: { '#entry': '/_nuxt/Dq3kTz9f.js' } } }] } },
      { input: nuxtStylesheets },
      { input: { style: [{ innerHTML: '.a[data-v-1]{color:red}</style>' }] } },
      { input: nuxtHints },
      { input: nuxtPayload(text), options: nuxtPayloadOptions },
      { input: nuxtEntryScripts },
    ],
  })),
  ...nuxtPayloadTexts.map((text, i): Scenario => ({
    name: `nuxt: renderer compiled tags, payload value ${i}`,
    render: { omitLineBreaks: true },
    entries: [
      { input: nuxtAppHeadTagsInput },
      withValues(title => ({ title, meta: [{ name: 'description', content: 'About %siteName' }] }), ['Page "one" & more']),
      { input: { script: [{ tagPosition: 'head', tagPriority: 'critical', type: 'importmap', innerHTML: { imports: { '#entry': '/_nuxt/Dq3kTz9f.js' } } }] } },
      { input: nuxtStylesheets },
      { input: nuxtHints },
      withValues(contents => nuxtPayloadTags(contents), [text]),
      { input: nuxtConfigTags },
      { input: nuxtEntryScripts },
    ],
  })),
  {
    name: 'nuxt: renderer pushes, 4.6.4, payload extraction',
    entries: [
      { input: nuxtAppHead },
      { input: { script: [{ type: 'importmap', innerHTML: { imports: { '#entry': '/_nuxt/Dq3kTz9f.js' } } }] } },
      { input: { link: [{ rel: 'preload', as: 'fetch', crossorigin: 'anonymous', href: '/posts/a/_payload.json?b' }] } },
      { input: nuxtStylesheets },
      { input: nuxtHints },
      { input: nuxtPayload('[{"a":1}]', { 'data-src': '/posts/a/_payload.json?b' }), options: nuxtPayloadOptions },
      { input: { script: [{ type: null, src: '/_nuxt/legacy.js', defer: true, tagPosition: 'head', crossorigin: '' }] } },
    ],
  },
  {
    name: 'nuxt: renderer compiled tags, no ssr and payload extraction',
    entries: [
      withValues(contents => nuxtPayloadTags(contents, { 'data-ssr': false, 'data-src': '/a/_payload.json' }), ['[{"a":1}]']),
      { input: nuxtConfigTags },
    ],
  },
  {
    name: 'nuxt: no scripts hints',
    entries: [
      { input: { script: [{ tagPosition: 'head', type: 'speculationrules', innerHTML: { prefetch: [{ where: { href_matches: '/*' }, eagerness: 'moderate' }], prerender: [{ where: { href_matches: '/*' }, eagerness: 'moderate' }] } }] } },
      { input: { style: [{ tagPosition: 'head', innerHTML: '@view-transition{navigation:auto}' }] } },
    ],
  },
  {
    name: 'nuxt: payload value that is not text',
    entries: [
      withValues(contents => nuxtPayloadTags(contents), [{ a: '<b>' }]),
      withValues(contents => nuxtPayloadTags(contents, { id: 'second' }), [null]),
      withValues(contents => nuxtPayloadTags(contents, { id: 'third' }), ['']),
    ],
  },
  // head and render options
  { name: 'render: omitLineBreaks option', render: { omitLineBreaks: true }, entries: [{ input: { title: 'a', meta: [{ name: 'x', content: '1' }], script: [{ src: '/a.js', tagPosition: 'bodyClose' }, { src: '/b.js', tagPosition: 'bodyClose' }] } }] },
  { name: 'head: omitLineBreaks', head: { omitLineBreaks: true }, entries: [{ input: { title: 'a', meta: [{ name: 'x', content: '1' }, { name: 'y', content: '2' }] } }] },
  { name: 'head: defaults', head: { disableDefaults: false }, entries: [{ input: { title: 'a' } }] },
  { name: 'head: defaults overridden', head: { disableDefaults: false }, entries: [{ input: { htmlAttrs: { lang: 'fr', class: 'a' }, meta: [{ charset: 'latin1' }, { name: 'viewport', content: 'x' }] } }] },
  { name: 'head: defaults alone', head: { disableDefaults: false }, entries: [] },
  { name: 'head: init', head: { init: [{ title: 'init', meta: [{ name: 'a', content: 'b' }] }, undefined, false as any, { titleTemplate: '%s - i' }] }, entries: [{ input: { title: 'pushed' } }] },
  { name: 'head: init with defaults', head: { disableDefaults: false, init: [{ htmlAttrs: { lang: 'de' } }] }, entries: [] },
]
