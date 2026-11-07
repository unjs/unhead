// What Nuxt's renderer asks of unhead per request, for bench/compiled-nuxt-route.mjs. The caller
// passes the modules in, so a profile script can load the same fixtures. The input shapes are
// also in packages/unhead/test/unit/compiled/corpus.ts, where the differential tests run them.
//
// Source: nuxt main `packages/nuxt/src/runtime/server/renderer/index.ts` `renderRoute` plus
// `payload.ts`, read against released 4.6.4 `dist/runtime/server/renderer/index.js`. The normal
// non-streaming path, in order, with `_PAYLOAD_INLINE` true and no `noScripts`:
//
//   head.push(appHead)                                     before the app renders
//   head.push({ script: [importmap] })                     main: tagPosition head, tagPriority critical. 4.6.4: neither
//   head.push({ link: stylesheets })
//   head.push({ style: inlinedStyles })                    `features.inlineStyles`, on by default with Vite
//   head.push({ link: preloads + prefetches })
//   head.push({ script: renderPayloadJsonScript() }, { tagPosition: 'bodyClose', tagPriority: 'high' })
//   head.push({ script: entryScripts })
//   renderSSRHead(head, { omitLineBreaks: true })          the `unhead.renderSSRHeadOptions` default
//
// `createHead` gets `{ disableDefaults: true, plugins: [TemplateParamsPlugin] }`. `appHead` is the
// JSON the real 4.6.4 build emits, including the top-level `charset` and `viewport` keys and the
// empty arrays. Nothing here covers `pushNoScriptsHints`, the import map of a relative base, or
// a route with payload extraction: those are other branches of the same renderer.

const APP_HEAD = {
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

// What the patch compiles at build time. v3 turns the two shorthand keys into unknown tags and
// drops them at render, and compile refuses an unknown tag, so the patch leaves them out.
const { charset: _charset, viewport: _viewport, ...APP_HEAD_TAGS_INPUT } = APP_HEAD

const ENTRY_PATH = '/_nuxt/Dq3kTz9f.js'
const CONFIG_SCRIPT = 'window.__NUXT__={};window.__NUXT__.config={public:{},app:{baseURL:"/",buildId:"8c2f0d6e-3a1b-4f77-9e21-0b5d7c4a1e90",buildAssetsDir:"/_nuxt/",cdnURL:""}}'
const SEO_IMAGE = 'https://example.com/og/default.png'

// `style` is my estimate for a route with scoped component CSS. The other counts come from the brief.
export const ROUTE_SIZES = [
  { name: 'small', css: 3, hints: 5, scripts: 1, payload: 2 * 1024, styles: 1, modules: 6 },
  { name: 'typical', css: 5, hints: 30, scripts: 1, payload: 30 * 1024, styles: 2, modules: 25 },
  { name: 'large', css: 10, hints: 80, scripts: 1, payload: 300 * 1024, styles: 3, modules: 70 },
]

function chunk(i) {
  return `/_nuxt/${(i * 2654435761 % 4294967296).toString(36).padStart(8, 'x')}.js`
}

function css(name, i) {
  return `/_nuxt/${name}-${i}.${(i * 40503 % 65536).toString(36)}.css`
}

// the shapes `getPreloadLinks` and `getPrefetchLinks` of vue-bundle-renderer 2.5.0 return
function hint(i) {
  const prefetch = i % 3 === 2
  return i % 7 === 6
    ? { rel: prefetch ? 'prefetch' : 'preload', as: 'style', type: null, crossorigin: '', href: css('lazy', i) }
    : prefetch
      ? { rel: 'prefetch', as: 'script', type: null, crossorigin: '', href: chunk(i) }
      : { rel: 'modulepreload', as: 'script', type: null, crossorigin: '', href: chunk(i) }
}

// A devalue document: slashes encoded as `/`, `<` escaped by devalue itself, and a `%`
// in the text. `%` is common in real data and must not cost anything.
function payload(size, variant) {
  const row = `{"id":${variant},"slug":"\\u002Fposts\\u002Fhello-world","title":"Post ${variant}","body":"50% of the text, with unicode é ✓ and \\u003Cb\\u003Etags\\u003C\\u002Fb\\u003E"},`
  let body = '[["ShallowReactive",1],{"data":2,"state":3,"once":4,"_errors":5,"serverRendered":6},['
  while (body.length < size)
    body += row
  return `${body}{}]]`
}

function pageTexts(name) {
  return [
    { title: `Hello ${name}`, description: `A short post about ${name}, with enough words to look real.` },
    { title: `Second ${name} post`, description: `Another post about ${name}, and it says something different.` },
    { title: `Third "quoted" ${name}`, description: `A third post, with "quotes" and an ampersand & a ${name}.` },
  ]
}

function ok(result) {
  if (result._tag !== 'Ok')
    throw new Error(`fixture input did not compile: ${result.reason}`)
  return result.tags
}

function createRoute(size, m) {
  const { compileTags, dynamicValue, prepareHeadInput, unpackMeta, useHead, useSeoMeta } = m
  const stylesheets = Array.from({ length: size.css }, (_, i) => ({ rel: 'stylesheet', href: css(size.name, i), crossorigin: '' }))
  const hints = Array.from({ length: size.hints }, (_, i) => hint(i))
  const inlineStyles = Array.from({ length: size.styles }, (_, i) => ({ innerHTML: `.${size.name}-${i}[data-v-${i}]{color:red;margin:0 auto}`.repeat(20) }))
  const entryScripts = Array.from({ length: size.scripts }, (_, i) => ({
    type: 'module',
    src: `/_nuxt/entry-${i}.js`,
    defer: null,
    tagPosition: 'head',
    crossorigin: '',
  }))
  const importMap = () => ({
    script: [{ tagPosition: 'head', tagPriority: 'critical', type: 'importmap', innerHTML: { imports: { '#entry': ENTRY_PATH } } }],
  })
  // `ssrContext.modules`, which fixes every list above for one build
  const modules = new Set(Array.from({ length: size.modules }, (_, i) => `components/${size.name}/section-${i}/Widget.vue`))

  const texts = pageTexts(size.name)
  const payloads = texts.map((_, t) => payload(size.payload, t))
  const pageHead = {
    link: [{ rel: 'canonical', href: `https://example.com/${size.name}` }],
    meta: [{ name: 'robots', content: 'index, follow' }],
    script: [{ type: 'application/ld+json', innerHTML: { '@type': 'WebPage', 'name': size.name } }],
  }
  const seoMeta = text => ({
    title: text.title,
    description: text.description,
    ogTitle: text.title,
    ogDescription: text.description,
    ogImage: SEO_IMAGE,
    twitterCard: 'summary_large_image',
  })
  // what the bundler transform emits for the two page calls
  const pageHeadTags = ok(compileTags(pageHead))
  const seoTags = ok(compileTags({
    title: dynamicValue(0),
    meta: unpackMeta({ description: dynamicValue(1), ogTitle: dynamicValue(0), ogDescription: dynamicValue(1), ogImage: SEO_IMAGE, twitterCard: 'summary_large_image' }),
  }, { dynamicValues: 2 }))
  const seoValues = texts.map(text => [text.title, text.description])
  const loosePage = texts.map(text => ({ link: [{ rel: 'alternate', hreflang: 'fr', href: `https://example.com/fr/${text.title.length}` }] }))

  // the page calls, as `useHead` and `useSeoMeta` run them with an injected head
  const looseCalls = (head, t) => {
    useHead(pageHead, { head })
    useSeoMeta(seoMeta(texts[t]), { head })
  }
  const compiledCalls = (head, t) => {
    useHead(pageHeadTags, { head })
    useHead(seoTags, { head, values: seoValues[t] })
  }

  // the renderer as it is today
  const looseRenderer = (head, t) => {
    head.push(importMap())
    head.push({ link: stylesheets })
    head.push({ style: inlineStyles })
    head.push({ link: hints })
    head.push({
      script: [
        { 'type': 'application/json', 'innerHTML': payloads[t], 'data-nuxt-data': 'nuxt-app', 'data-ssr': true, 'id': '__NUXT_DATA__' },
        { innerHTML: CONFIG_SCRIPT },
      ],
    }, { tagPosition: 'bodyClose', tagPriority: 'high' })
    head.push({ script: entryScripts })
  }

  // The renderer a Nuxt patch would write. The key joins per request, because a real patch
  // has to. A hit skips compile, and the input objects are built anyway, as in Nuxt today.
  const payloadTags = ok(compileTags({
    // `innerHTML` goes last: a `null` value lands in props, at the place the rebuilt input gives it
    script: [{ 'type': 'application/json', 'data-nuxt-data': 'nuxt-app', 'data-ssr': true, 'id': '__NUXT_DATA__', 'innerHTML': dynamicValue(0), 'tagPosition': 'bodyClose', 'tagPriority': 'high' }],
  }, { dynamicValues: 1 }))
  const payloadValues = payloads.map(text => [text])
  const compiledRenderer = (head, t) => {
    const key = [...modules].join()
    head.push(prepareHeadInput(importMap(), ENTRY_PATH))
    head.push(prepareHeadInput({ link: stylesheets }, `css:${key}`))
    head.push(prepareHeadInput({ style: inlineStyles }, `style:${key}`))
    head.push(prepareHeadInput({ link: hints }, `hints:${key}`))
    head.push(payloadTags, { values: payloadValues[t] })
    head.push(prepareHeadInput({ script: [{ innerHTML: CONFIG_SCRIPT, tagPosition: 'bodyClose', tagPriority: 'high' }] }, CONFIG_SCRIPT))
    head.push(prepareHeadInput({ script: entryScripts }, `scripts:${key}`))
  }

  const options = { disableDefaults: true, plugins: [m.TemplateParamsPlugin] }
  const renderOptions = { omitLineBreaks: true }
  const appHeadTags = prepareHeadInput(APP_HEAD_TAGS_INPUT)
  if (!Array.isArray(appHeadTags))
    throw new Error('the app head did not compile')
  const hooked = (name, listener) => ({ ...options, hooks: { [name]: listener } })
  // a module that reads what it gets and changes nothing, so byte parity still holds
  let seen = 0
  const tagsResolve = hooked('tags:resolve', (ctx) => { seen += ctx.tags.length })
  const entriesNormalize = hooked('entries:normalize', (ctx) => { seen += ctx.tags.length })

  const looseRoute = (headOptions, t) => {
    const head = m.createV3Head(headOptions)
    head.push(APP_HEAD)
    looseCalls(head, t)
    looseRenderer(head, t)
    return m.renderV3(head, renderOptions)
  }
  const compiledEntry = (headOptions, t) => {
    const head = m.createCompiledHead(headOptions)
    head.push(APP_HEAD)
    compiledCalls(head, t)
    looseRenderer(head, t)
    return m.renderCompiled(head, renderOptions)
  }

  // Nuxt 4.x below compatibility version 5 passes `legacyPlugins` of `@unhead/vue/legacy`. A
  // component `useSeoMeta` that stays loose, as an object `ogImage` does, adds
  // `FlatMetaPlugin`. None of these plugins can change compiled tags.
  const legacyOptions = { disableDefaults: true, plugins: m.legacyPlugins }
  const looseSeo = texts.map(text => ({ ogImage: { url: SEO_IMAGE, width: 1200, height: 630, alt: text.title }, ogUrl: `https://example.com/${size.name}` }))
  const legacyLooseRoute = (t) => {
    const head = m.createV3Head(legacyOptions)
    head.push(APP_HEAD)
    looseCalls(head, t)
    useSeoMeta(looseSeo[t], { head })
    looseRenderer(head, t)
    return m.renderV3(head, renderOptions)
  }

  let tick = 0
  const nextT = () => tick++ % 3
  return {
    name: size.name,
    tags: { css: size.css, hints: size.hints, scripts: size.scripts, payload: size.payload },
    seen: () => seen,
    variants: {
      'A v3': (t = nextT()) => looseRoute(options, t),
      'B compile only': (t = nextT()) => compiledEntry(options, t),
      'C renderer compiled tags': (t = nextT()) => {
        const head = m.createCompiledHead(options)
        head.push(appHeadTags)
        compiledCalls(head, t)
        compiledRenderer(head, t)
        return m.renderCompiled(head, renderOptions)
      },
      'D C + loose call': (t = nextT()) => {
        const head = m.createCompiledHead(options)
        head.push(appHeadTags)
        compiledCalls(head, t)
        useHead(loosePage[t], { head })
        compiledRenderer(head, t)
        return m.renderCompiled(head, renderOptions)
      },
      'E B + tags:resolve': (t = nextT()) => compiledEntry(tagsResolve, t),
      'F B + entries:normalize': (t = nextT()) => compiledEntry(entriesNormalize, t),
      'G A + tags:resolve': (t = nextT()) => looseRoute(tagsResolve, t),
      'H A + entries:normalize': (t = nextT()) => looseRoute(entriesNormalize, t),
      'I A + Nuxt 4 plugins, loose seo': (t = nextT()) => legacyLooseRoute(t),
      'J C + Nuxt 4 plugins, loose seo': (t = nextT()) => {
        const head = m.createCompiledHead(legacyOptions)
        head.push(appHeadTags)
        compiledCalls(head, t)
        useSeoMeta(looseSeo[t], { head })
        compiledRenderer(head, t)
        return m.renderCompiled(head, renderOptions)
      },
      'K B + Nuxt 4 plugins, loose seo': (t = nextT()) => {
        const head = m.createCompiledHead(legacyOptions)
        head.push(APP_HEAD)
        compiledCalls(head, t)
        useSeoMeta(looseSeo[t], { head })
        looseRenderer(head, t)
        return m.renderCompiled(head, renderOptions)
      },
      // J with the Nuxt 5 list, so J against L is the cost of the legacy plugins
      'L C + loose seo': (t = nextT()) => {
        const head = m.createCompiledHead(options)
        head.push(appHeadTags)
        compiledCalls(head, t)
        useSeoMeta(looseSeo[t], { head })
        compiledRenderer(head, t)
        return m.renderCompiled(head, renderOptions)
      },
    },
    // D, I, J, and K render more tags than the rest, so each has its own loose twin
    expected: {
      'I A + Nuxt 4 plugins, loose seo': legacyLooseRoute,
      'J C + Nuxt 4 plugins, loose seo': legacyLooseRoute,
      'K B + Nuxt 4 plugins, loose seo': legacyLooseRoute,
      'L C + loose seo': legacyLooseRoute,
      'D C + loose call': (t) => {
        const head = m.createV3Head(options)
        head.push(APP_HEAD)
        looseCalls(head, t)
        useHead(loosePage[t], { head })
        looseRenderer(head, t)
        return m.renderV3(head, renderOptions)
      },
    },
  }
}

export function createNuxtRoutes(m) {
  return ROUTE_SIZES.map(size => createRoute(size, m))
}

export const BASELINES = {
  'B compile only': 'A v3',
  'C renderer compiled tags': 'A v3',
  'D C + loose call': 'A v3',
  'E B + tags:resolve': 'G A + tags:resolve',
  'F B + entries:normalize': 'H A + entries:normalize',
  'G A + tags:resolve': 'A v3',
  'H A + entries:normalize': 'A v3',
  'I A + Nuxt 4 plugins, loose seo': 'A v3',
  'J C + Nuxt 4 plugins, loose seo': 'I A + Nuxt 4 plugins, loose seo',
  'K B + Nuxt 4 plugins, loose seo': 'I A + Nuxt 4 plugins, loose seo',
  'L C + loose seo': 'J C + Nuxt 4 plugins, loose seo',
}
