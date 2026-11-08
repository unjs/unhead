import type { HeadPluginInput } from '../../../src/types'
import { describe, expect, it } from 'vitest'
import { compileTags } from '../../../src/compiled'
import { createHead, renderSSRHead } from '../../../src/compiled/server'
import { useSeoMeta } from '../../../src/composables'
import { AliasSortingPlugin, DeprecationsPlugin, FlatMetaPlugin, PromisesPlugin, TemplateParamsPlugin } from '../../../src/plugins'
import { createHead as createV3Head, renderSSRHead as renderV3 } from '../../../src/server'
import { corpus } from './corpus'
import { headState, MODES, renderScenarioCompiled, renderScenarioV3, toCompiledTags, usesCompiledTags } from './util'

// Nuxt 4.6.4 below compatibility version 5: `legacyPlugins` from `@unhead/vue/legacy`, in
// the `unhead-options.mjs` template, with `disableDefaults: true`
const NUXT_4: HeadPluginInput[] = [DeprecationsPlugin, PromisesPlugin, TemplateParamsPlugin, AliasSortingPlugin]

const PLUGIN_SETS: [string, HeadPluginInput[]][] = [
  ['FlatMetaPlugin', [FlatMetaPlugin]],
  ['DeprecationsPlugin', [DeprecationsPlugin]],
  ['PromisesPlugin', [PromisesPlugin]],
  ['AliasSortingPlugin', [AliasSortingPlugin]],
  ['every one of them', [FlatMetaPlugin, DeprecationsPlugin, PromisesPlugin, AliasSortingPlugin, TemplateParamsPlugin]],
  ['the Nuxt 4 defaults', NUXT_4],
]

interface Step {
  input: any
  options?: any
  /** Pushes the input through `useSeoMeta`, which always stays loose. */
  seo?: boolean
}

const SCENARIOS: { name: string, steps: Step[] }[] = [
  {
    name: 'a loose useSeoMeta over page compiled tags',
    steps: [
      { input: { title: 'Page', meta: [{ name: 'description', content: 'From the page' }], link: [{ rel: 'canonical', href: 'https://e.com/a' }] } },
      { seo: true, input: { title: 'Seo', description: 'From seo', ogTitle: 'OG', ogImage: { url: 'https://e.com/a.png', width: 1200 }, twitterCard: 'summary_large_image', robots: { index: true, follow: false } } },
      { input: { meta: [{ property: 'og:title', content: 'Later' }] } },
    ],
  },
  {
    name: 'a loose useSeoMeta with entry options',
    steps: [
      { seo: true, input: { description: 'a', ogImage: ['https://e.com/1.png', 'https://e.com/2.png'] }, options: { tagPriority: 'low' } },
      { input: { meta: [{ name: 'description', content: 'b' }] } },
    ],
  },
  {
    name: 'deprecated props in loose input',
    steps: [
      { input: { script: [{ hid: 'a', src: '/a.js' }, { vmid: 'b', children: 'b()' }, { src: '/c.js', body: true }, { src: '/d.js', body: false }] } },
      { input: { title: { textContent: 'T', renderPriority: -5 }, link: [{ rel: 'x', href: '/y', renderPriority: 3 }] } },
      { input: { script: [{ key: 'a', src: '/a2.js' }], meta: [{ name: 'x', content: 'y' }] } },
      { input: { templateParams: { hid: 'p', site: 'S' }, meta: [{ name: 'z', content: '%site' }] } },
    ],
  },
  {
    name: 'a promise in loose input',
    steps: [
      { input: { title: 'Sync', meta: [{ name: 'a', content: 'sync' }] } },
      { input: { title: Promise.resolve('Async'), meta: [{ name: 'b', content: Promise.resolve('async') }] } },
      { input: { link: [{ rel: 'icon', href: '/i' }] } },
      { input: { script: [Promise.resolve({ src: '/p.js' })] } },
    ],
  },
  {
    name: 'alias priorities',
    steps: [
      { input: { script: [{ key: 'b', src: '/b.js' }, { key: 'c', src: '/c.js', tagPriority: 5 }] } },
      { input: { script: [{ src: '/a.js', tagPriority: 'before:script:b' }] } },
      { input: { link: [{ rel: 'stylesheet', href: '/s.css', tagPriority: 'after:script:c' }] } },
      { input: { meta: [{ name: 'm', content: 'c' }] }, options: { tagPriority: 'before:script:b' } },
    ],
  },
  {
    name: 'an alias priority set through renderPriority',
    steps: [
      { input: { title: 'T', meta: [{ name: 'a', content: 'b' }] } },
      { input: { title: { textContent: 'Moved', renderPriority: 'before:meta:a' } } },
    ],
  },
  {
    name: 'an alias priority with no target',
    steps: [
      { input: { title: 'T', script: [{ src: '/a.js' }] } },
      { input: { script: [{ src: '/b.js', tagPriority: 'after:script:missing' }] } },
    ],
  },
  {
    name: 'everything together',
    steps: [
      { input: { title: 'Page', titleTemplate: '%s %separator %site', templateParams: { site: 'S', separator: '-' }, script: [{ key: 'b', src: '/b.js' }] } },
      { seo: true, input: { description: 'About %site', ogImage: 'https://e.com/a.png' } },
      { input: { script: [{ hid: 'h', src: '/h.js', body: true }] } },
      { input: { meta: [{ name: 'p', content: Promise.resolve('later') }] } },
      { input: { script: [{ src: '/a.js', tagPriority: 'before:script:b' }] } },
    ],
  },
]

function pushSteps(head: any, steps: Step[], compiledTags: (input: any, index: number) => any) {
  steps.forEach((step, index) => step.seo
    ? useSeoMeta(head, step.input, step.options)
    : head.push(compiledTags(step.input, index), step.options))
}

const settle = () => new Promise(resolve => setTimeout(resolve))

// renders before and after the promises of the input settle, with the head state each time
async function renderSteps(head: any, render: (head: any) => any, steps: Step[], compiledTags: (input: any, index: number) => any) {
  pushSteps(head, steps, compiledTags)
  const first = { html: render(head), state: headState(head), again: render(head) }
  await settle()
  return { first, settled: { html: render(head), method: head.render(), state: headState(head) } }
}

function ok(input: any) {
  const result = compileTags(input)
  if (result._tag !== 'Ok')
    throw new Error(result.reason)
  // a fresh array per call, so one test cannot reach another through the memo
  return [...result.tags]
}

describe.each(PLUGIN_SETS)('the corpus with %s', (_, plugins) => {
  describe.each(MODES)('%s', (mode) => {
    it.each(corpus.map(scenario => [scenario.name, scenario] as const))('%s', (_name, scenario) => {
      expect(renderScenarioCompiled(scenario, plugins, mode)).toEqual(renderScenarioV3(scenario, plugins))
    })
  })
})

describe.each(PLUGIN_SETS)('plugin input with %s', (_, plugins) => {
  describe.each(MODES)('%s', (mode) => {
    it.each(SCENARIOS.map(scenario => [scenario.name, scenario] as const))('%s', async (_name, { steps }) => {
      const v3 = await renderSteps(createV3Head({ disableDefaults: true, plugins }), renderV3, steps, input => input)
      const compiled = await renderSteps(createHead({ disableDefaults: true, plugins }), renderSSRHead, steps, (input, index) => usesCompiledTags(mode, index) ? toCompiledTags(input) : input)
      expect(compiled).toEqual(v3)
    })
  })
})

// Only cached compiled tags still render their old tags after the compiled tags changed. The full runtime tier
// rebuilds the tags of compiled tags on every render.
function renderAfterCompiledTagsChange(plugins: HeadPluginInput[], extra: (head: any) => void = () => {}) {
  const compiledTags: any[] = ok({ title: 'Compiled', script: [{ key: 'b', src: '/b.js' }], meta: [{ name: 'x', content: 'static' }] })
  const render = () => {
    const head = createHead({ disableDefaults: true, plugins })
    head.push(compiledTags)
    extra(head)
    return renderSSRHead(head).headTags
  }
  const before = render()
  compiledTags[2] = ['meta', { name: 'x', content: 'changed' }, 100, 'meta:x', 0, 1]
  return { before, after: render() }
}

describe('the tier a built-in plugin takes', () => {
  const loose: [string, (head: any) => void][] = [
    ['compiled tags only', () => {}],
    ['a loose useSeoMeta', head => useSeoMeta(head, { description: 'd', ogImage: { url: '/a.png', width: 1 } })],
    ['deprecated props in loose input', head => head.push({ script: [{ hid: 'h', src: '/h.js', body: true }] })],
    ['a promise in loose input', head => head.push({ meta: [{ name: 'p', content: Promise.resolve('later') }] })],
    ['a priority alias that is not an alias', head => head.push({ script: [{ src: '/a.js', tagPriority: 'high' }] })],
  ]

  describe.each(PLUGIN_SETS)('with %s', (_, plugins) => {
    it.each(loose)('stays fast for %s', (_name, extra) => {
      const { before, after } = renderAfterCompiledTagsChange(plugins, extra)
      expect(before).toContain('content="static"')
      expect(after).toBe(before)
    })
  })

  it.each([
    ['in loose input', (head: any) => head.push({ script: [{ src: '/a.js', tagPriority: 'before:script:b' }] })],
    ['in compiled entry options', (head: any) => head.push(ok({ meta: [{ name: 'm', content: 'c' }] }), { tagPriority: 'after:script:b' })],
    ['through renderPriority', (head: any) => head.push({ title: { textContent: 'T', renderPriority: 'before:script:b' } })],
    ['in a loose useSeoMeta', (head: any) => useSeoMeta(head, { description: 'd' }, { tagPriority: 'before:script:b' })],
  ])('takes v3 for an alias priority %s', (_name, extra) => {
    const { after } = renderAfterCompiledTagsChange(NUXT_4, extra)
    expect(after).toContain('content="changed"')
  })

  it.each([
    ['a plugin with another key', { key: 'custom', hooks: { 'entries:normalize': () => {} } }],
    ['a built-in key with other hooks', { key: 'flatMeta', hooks: { 'tags:resolve': () => {} } }],
    ['a built-in key with more hooks', { key: 'aliasSorting', hooks: { 'tags:resolve': () => {}, 'tags:afterResolve': () => {} } }],
    ['a function plugin with a built-in key and other hooks', Object.assign(() => ({ key: 'promises', hooks: { 'entries:normalize': () => {} } }), { key: 'promises' })],
  ] as [string, HeadPluginInput][])('takes v3 for %s', (_name, plugin) => {
    // the first plugin with a key wins, so the real one must not come first
    const { after } = renderAfterCompiledTagsChange([TemplateParamsPlugin, plugin])
    expect(after).toContain('content="changed"')
  })

  it('takes v3 for a listener added to head.hooks', () => {
    const { after } = renderAfterCompiledTagsChange(NUXT_4, head => head.hooks.hook('entries:resolve', () => {}))
    expect(after).toContain('content="changed"')
  })
})

describe('the hooks of a built-in plugin on loose entries', () => {
  const steps: Step[] = [
    { input: { title: 'A', meta: [{ name: 'a', content: '1' }] } },
    { input: { script: [{ hid: 'h', src: '/h.js' }] }, options: { tagPosition: 'bodyClose' } },
    { input: { link: [{ rel: 'icon', href: '/i' }] } },
    { seo: true, input: { description: 'd', ogImage: 'https://e.com/a.png' } },
  ]

  // A plugin with a built-in key and its hook names takes the place of that plugin, so
  // these record what the real one would get.
  function recorders(calls: unknown[]): HeadPluginInput[] {
    return [
      { key: 'promises', hooks: { 'entries:resolve': (ctx: any) => {
        calls.push(['entries:resolve', Object.keys(ctx), ctx.entries.map((entry: any) => entry._i), ctx.tagMap.size, ctx.tags.length])
      } } },
      { key: 'deprecations', hooks: { 'entries:normalize': (ctx: any) => {
        calls.push(['entries:normalize', Object.keys(ctx), ctx.entry._i, ctx.entry.input, ctx.entry.options, structuredClone(ctx.tags)])
      } } },
    ]
  }

  function record(create: any, render: any, compiledTags: (input: any, index: number) => any) {
    const calls: unknown[] = []
    const head = create({ disableDefaults: true, plugins: [...recorders(calls), FlatMetaPlugin] })
    pushSteps(head, steps, compiledTags)
    const html = render(head)
    return { calls, html }
  }

  it('get the v3 context for every loose entry', () => {
    const v3 = record(createV3Head, renderV3, input => input)
    expect(record(createHead, renderSSRHead, input => input)).toEqual(v3)
  })

  it('get the v3 context for only the loose entries next to compiled tags', () => {
    const v3 = record(createV3Head, renderV3, input => input)
    const compiledIndexes = new Set([1, 3])
    const compiled = record(createHead, renderSSRHead, (input, index) => compiledIndexes.has(index + 1) ? toCompiledTags(input) : input)
    expect(compiled.html).toEqual(v3.html)
    expect(compiled.calls).toEqual(v3.calls
      .filter((call: any) => call[0] !== 'entries:normalize' || !compiledIndexes.has(call[2]))
      .map((call: any) => call[0] === 'entries:resolve' ? [...call.slice(0, 2), call[2].filter((i: number) => !compiledIndexes.has(i)), ...call.slice(3)] : call))
  })
})
