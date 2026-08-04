/**
 * Build-time plan emitter gates. The dual-path law is the whole point:
 * for any static input, pushing emitEntryPlan(input).plan must render the
 * byte-identical SSR payload as pushing the raw object through L1.
 */
import type { EntryOptions } from '../packages/unhead/src/v4/core'
import { describe, expect, it } from 'vitest'
import {
  emitEntryPlan,
  emitRoutePlan,
  hole,
  isHole,
  PlanEmitError,
  planToCode,
} from '../packages/unhead/src/v4/emit'
import { createHead, renderSSRHead } from '../packages/unhead/src/v4/server'
import { applyPage, ENTRIES } from './v4/fixtures'

function render(apply: (push: (input: any, opts?: EntryOptions) => void) => void) {
  const head = createHead()
  apply((input, opts) => head.push(input, opts))
  return renderSSRHead(head)
}

const objectPath = (input: any, opts?: EntryOptions) => render(p => p(input, opts))

function planPath(input: any, opts?: EntryOptions, fills?: unknown[]) {
  const { plan } = emitEntryPlan(input, opts)
  return render(p => p(plan, fills ? { fills } : undefined))
}

// ≥25 diverse static inputs; every one must satisfy the dual-path law
const CORPUS: [name: string, input: Record<string, any>, opts?: EntryOptions][] = [
  ['fixtures: app config (htmlAttrs + keyed script)', ENTRIES[0][0], ENTRIES[0][1]],
  ['fixtures: styles + resource hints', ENTRIES[1][0], ENTRIES[1][1]],
  ['fixtures: body scripts at bodyClose', ENTRIES[2][0], ENTRIES[2][1]],
  ['fixtures: json payload script', ENTRIES[3][0], ENTRIES[3][1]],
  ['fixtures: seo meta set', ENTRIES[5][0], ENTRIES[5][1]],
  ['fixtures: page overrides', ENTRIES[6][0], ENTRIES[6][1]],
  ['title with entities', { title: 'Hello & <World>' }],
  ['title number', { title: 42 }],
  ['charset meta', { meta: [{ charset: 'utf-8' }] }],
  ['base', { base: { href: '/app/', target: '_blank' } }],
  ['style with @import (weight 40)', { style: ['@import url("/x.css"); body{margin:0}'] }],
  ['keyed style textContent', { style: [{ textContent: '.a{color:red}', key: 'brand' }] }],
  ['noscript at bodyOpen (entry option)', { noscript: [{ innerHTML: '<img src="/px.gif">' }] }, { tagPosition: 'bodyOpen' }],
  ['tag-level bodyOpen script', { script: [{ src: '/top.js', tagPosition: 'bodyOpen' }] }],
  ['keyed script (data-hid)', { script: [{ src: '/k.js', key: 'analytics' }] }],
  ['arrayable og:image content set', { meta: [{ property: 'og:image', content: ['https://a.png', 'https://b.png'] }] }],
  ['arrayable og:locale:alternate', { meta: [{ property: 'og:locale:alternate', content: ['fr_FR', 'de_DE'] }] }],
  ['non-arrayable content fan-out (later wins)', { meta: [{ name: 'keywords', content: ['a', 'b'] }] }],
  ['htmlAttrs class/style objects', { htmlAttrs: { lang: 'fr', class: { dark: true, hidden: false }, style: { color: 'red', margin: '0' } } }],
  ['htmlAttrs multi-token class string', { htmlAttrs: { class: 'dark mode-a', lang: 'fr' } }],
  ['bodyAttrs class array + data attr', { bodyAttrs: { 'class': ['antialiased', 'font-sans'], 'data-theme': 'dark' } }],
  ['boolean attrs', { script: [{ src: '/x.js', async: true, defer: '', nomodule: false }] }],
  ['number prop values', { meta: [{ name: 'twitter:image:width', content: 1200 }] }],
  ['json-ld script object innerHTML', { script: [{ type: 'application/ld+json', innerHTML: { '@context': 'https://schema.org', '@type': 'Article', 'headline': 'Hi <b>' } }] }],
  ['importmap object innerHTML', { script: [{ type: 'importmap', innerHTML: { imports: { vue: '/vue.js' } } }] }],
  ['meta http-equiv', { meta: [{ 'http-equiv': 'refresh', 'content': '30' }] }],
  ['canonical link', { link: [{ rel: 'canonical', href: 'https://example.com/a' }] }],
  ['alternate hreflang pair', { link: [{ rel: 'alternate', hreflang: 'fr', href: 'https://example.com/fr' }, { rel: 'alternate', hreflang: 'de', href: 'https://example.com/de' }] }],
  ['link prop bag', { link: [{ rel: 'preload', as: 'font', type: 'font/woff2', href: '/f.woff2', crossorigin: 'anonymous', media: '(min-width: 600px)' }] }],
  ['uppercase prop names lowercased', { link: [{ REL: 'stylesheet', HREF: '/x.css' }] }],
  ['data-* keeps case', { htmlAttrs: { 'data-XYZ': '1' } }],
  ['meta empty content stays', { meta: [{ name: 'x-empty', content: '' }] }],
  ['null props dropped', { script: [{ src: '/x.js', integrity: null, referrerpolicy: undefined }] }],
  ['content-only script/style strings', { script: ['console.log(1)'], style: ['body{}'] }],
  ['entry priority alias', { link: [{ rel: 'stylesheet', href: '/c.css' }] }, { tagPriority: 'critical' }],
  ['entry numeric priority', { meta: [{ name: 'description', content: 'x' }] }, { tagPriority: 42 }],
  ['script terminator escaping', { script: [{ innerHTML: 'if (a</script>b) {}' }] }],
]

describe('emitEntryPlan: dual-path law', () => {
  for (const [name, input, opts] of CORPUS) {
    it(name, () => {
      const res = emitEntryPlan(input, opts)
      expect(res.holes).toBe(0)
      expect(planPath(input, opts)).toEqual(objectPath(input, opts))
    })
  }

  it('arrayable metas emit per-tuple with the pos|8 flag; interleaved groups seal', () => {
    const input = {
      meta: [
        { property: 'og:image', content: 'a.png' },
        { property: 'og:image:width', content: 100 },
        { property: 'og:image', content: 'b.png' },
      ],
    }
    const { plan } = emitEntryPlan(input)
    expect(plan).toEqual([
      [100, 'meta:og:image', '<meta property="og:image" content="a.png">', 8],
      [100, 'meta:og:image:width', '<meta property="og:image:width" content="100">', 8],
      [100, 'meta:og:image', '<meta property="og:image" content="b.png">', 8],
    ])
    expect(planPath(input)).toEqual(objectPath(input))
  })

  it('revived arrayable metas keep F_ARRAYABLE: runtime og:image dedupes like the object path', () => {
    const input = {
      meta: [
        { property: 'og:image', content: 'a.png' },
        { property: 'og:image', content: 'b.png' },
      ],
    }
    const runtime = { meta: [{ property: 'og:image', content: 'c.png' }, { property: 'og:image', content: 'd.png' }] }
    const { plan } = emitEntryPlan(input)
    const a = render((p) => {
      p(input)
      p(runtime)
    })
    const b = render((p) => {
      p(plan)
      p(runtime)
    })
    expect(b).toEqual(a)
    // later entry replaces the whole arrayable set (v3 semantics), then appends within itself
    expect(b.headTags).not.toContain('a.png')
    expect(b.headTags).toContain('c.png')
    expect(b.headTags).toContain('d.png')
  })
})

describe('holes', () => {
  it('hole() and isHole()', () => {
    expect(isHole(hole())).toBe(true)
    expect(isHole(hole('json'))).toBe(true)
    expect(isHole({})).toBe(false)
    expect(isHole('x')).toBe(false)
  })

  it('title hole: filled plan matches the object path', () => {
    const { plan, holes, fillOrder } = emitEntryPlan({ title: hole() })
    expect(holes).toBe(1)
    expect(fillOrder).toEqual([0])
    expect(plan).toEqual([[10, 'title', ['<title>', '</title>'], 0]])
    const a = objectPath({ title: 'About & <Contact' })
    const b = render(p => p(plan, { fills: ['About & <Contact'] }))
    expect(b).toEqual(a)
  })

  it('text mode escapes & and < at fill time', () => {
    const { plan } = emitEntryPlan({ title: hole() })
    const out = render(p => p(plan, { fills: ['a <b> & c'] }))
    expect(out.headTags).toContain('<title>a &lt;b&gt; &amp; c</title>')
  })

  it('meta content hole: attr mode segments', () => {
    const { plan } = emitEntryPlan({ meta: [{ name: 'description', content: hole() }] })
    expect(plan).toEqual([[100, 'meta:description', ['<meta name="description" content="', '">'], 1]])
    const out = render(p => p(plan, { fills: ['say "hi"'] }))
    expect(out.headTags).toContain('<meta name="description" content="say &quot;hi&quot;">')
    // and byte parity with the object path for the same value
    expect(render(p => p(plan, { fills: ['say "hi"'] })))
      .toEqual(objectPath({ meta: [{ name: 'description', content: 'say "hi"' }] }))
  })

  it('attr fragment hole: htmlAttrs lang', () => {
    const { plan } = emitEntryPlan({ htmlAttrs: { lang: hole() } })
    expect(plan).toEqual([[100, 'htmlAttrs:lang', [' lang="', '"'], 1, 3]])
    const b = render(p => p(plan, { fills: ['fr'] }))
    expect(b).toEqual(objectPath({ htmlAttrs: { lang: 'fr' } }))
  })

  it('json hole inside keyed script innerHTML', () => {
    const input = { script: [{ key: 'state', type: 'application/json', innerHTML: { user: hole() } }] }
    const { plan, holes } = emitEntryPlan(input)
    expect(holes).toBe(1)
    // byte parity with the object path for a plain value
    expect(render(p => p(plan, { fills: ['bob'] })))
      .toEqual(objectPath({ script: [{ key: 'state', type: 'application/json', innerHTML: { user: 'bob' } }] }))
    // json mode neuters < identically to compile-time JSON escaping
    expect(render(p => p(plan, { fills: ['x</script>'] })))
      .toEqual(objectPath({ script: [{ key: 'state', type: 'application/json', innerHTML: { user: 'x</script>' } }] }))
  })

  it('multi-tuple fill ordering follows the plan cursor', () => {
    const { plan, holes, fillOrder } = emitEntryPlan({
      title: hole(),
      htmlAttrs: { lang: hole() },
      meta: [{ name: 'description', content: hole() }],
    })
    expect(holes).toBe(3)
    // entry plans keep input traversal order
    expect(fillOrder).toEqual([0, 1, 2])
    const b = render(p => p(plan, { fills: ['T', 'fr', 'D'] }))
    expect(b).toEqual(objectPath({ title: 'T', htmlAttrs: { lang: 'fr' }, meta: [{ name: 'description', content: 'D' }] }))
  })

  it('explicit mode overrides inference', () => {
    const { plan } = emitEntryPlan({ meta: [{ name: 'x', content: hole('text') }] })
    const out = render(p => p(plan, { fills: ['a&b'] }))
    expect(out.headTags).toContain('content="a&amp;b"')
  })

  it('identity-critical holes throw: link href', () => {
    expect(() => emitEntryPlan({ link: [{ rel: 'stylesheet', href: hole() }] })).toThrow(PlanEmitError)
  })

  it('identity-critical holes throw: meta name', () => {
    expect(() => emitEntryPlan({ meta: [{ name: hole(), content: 'x' }] })).toThrow(PlanEmitError)
  })

  it('keyed link tolerates an href hole (identity comes from the key)', () => {
    const { plan } = emitEntryPlan({ link: [{ rel: 'stylesheet', href: hole(), key: 'theme' }] })
    const b = render(p => p(plan, { fills: ['/dark.css'] }))
    expect(b).toEqual(objectPath({ link: [{ rel: 'stylesheet', href: '/dark.css', key: 'theme' }] }))
  })

  it('config holes throw: key, tagPriority', () => {
    expect(() => emitEntryPlan({ script: [{ src: '/x.js', key: hole() }] })).toThrow(PlanEmitError)
    expect(() => emitEntryPlan({ script: [{ src: '/x.js', tagPriority: hole() }] })).toThrow(PlanEmitError)
  })

  it('raw innerHTML hole without a mode throws; explicit json is accepted', () => {
    expect(() => emitEntryPlan({ script: [{ key: 'k', innerHTML: hole() }] })).toThrow(PlanEmitError)
    const { plan } = emitEntryPlan({ script: [{ key: 'k', type: 'application/json', innerHTML: hole('json') }] })
    expect(plan[0][2]).toHaveLength(2)
  })

  it('a hole the compiler drops throws (contentless meta)', () => {
    expect(() => emitEntryPlan({ meta: [{ name: 'desc', media: hole() }] })).toThrow(PlanEmitError)
  })

  it('titleTemplate in an entry plan throws', () => {
    expect(() => emitEntryPlan({ titleTemplate: '%s · Site', title: 'A' })).toThrow(PlanEmitError)
  })

  it('function values throw', () => {
    expect(() => emitEntryPlan({ title: () => 'x' })).toThrow(PlanEmitError)
    expect(() => emitEntryPlan({ meta: [{ name: 'd', content: () => 'x' }] })).toThrow(PlanEmitError)
  })
})

describe('emitRoutePlan: cross-entry pre-merge', () => {
  const routeEntries = () => ENTRIES.map(([input, opts]) => [input, opts] as [Record<string, any>, EntryOptions?])

  it('folds the whole fixtures page into one plan, byte-equal to the multi-entry path', () => {
    const { plan, holes } = emitRoutePlan(routeEntries())
    expect(holes).toBe(0)
    const a = render(applyPage)
    const b = render(p => p(plan))
    expect(b.htmlAttrs).toBe(a.htmlAttrs)
    expect(b.bodyAttrs).toBe(a.bodyAttrs)
    expect(b.bodyTagsOpen).toBe(a.bodyTagsOpen)
    expect(b.bodyTags).toBe(a.bodyTags)
    expect(b.headTags).toBe(a.headTags)
  })

  it('static titleTemplate + static title fold to a final title', () => {
    const { plan } = emitRoutePlan(routeEntries())
    const title = plan.find(t => t[1] === 'title')!
    expect(title[0]).toBe(10)
    expect(title[2]).toBe('<title>About · Harlan Wilton</title>')
    expect(plan.some(t => t[1] === 'titleTemplate')).toBe(false)
  })

  it('merged tags keep their true d and w (canonical keeps entry priority 101)', () => {
    const { plan } = emitRoutePlan(routeEntries())
    const canonical = plan.find(t => t[1] === 'canonical')!
    expect(canonical[0]).toBe(101)
    // dedupe winner keeps its true weight: page description (100) beat site default (101)
    const description = plan.find(t => t[1] === 'meta:description')!
    expect(description[0]).toBe(100)
    expect(description[2]).toContain('About Harlan Wilton, open source developer.')
  })

  it('a runtime push on top of the folded plan still overrides via ordinary dedupe', () => {
    const { plan } = emitRoutePlan(routeEntries())
    const head = createHead()
    head.push(plan)
    head.push({ meta: [{ name: 'description', content: 'Overridden' }] })
    const out = renderSSRHead(head)
    expect(out.headTags).toContain('<meta name="description" content="Overridden">')
    expect(out.headTags).not.toContain('About Harlan Wilton, open source developer.')
  })

  it('holes flow through the fold; fill order follows the sorted plan, fillOrder maps back', () => {
    const { plan, holes, fillOrder } = emitRoutePlan([
      [{ meta: [{ name: 'description', content: hole() }] }], // hole 0, w 100
      [{ title: hole() }], // hole 1, w 10 → first fill slot
    ])
    expect(holes).toBe(2)
    expect(fillOrder).toEqual([1, 0])
    const b = render(p => p(plan, { fills: ['My Title', 'My Desc'] }))
    const a = render((p) => {
      p({ meta: [{ name: 'description', content: 'My Desc' }] })
      p({ title: 'My Title' })
    })
    expect(b).toEqual(a)
  })

  it('static titleTemplate + hole title throws', () => {
    expect(() => emitRoutePlan([
      [{ titleTemplate: '%s · Site' }],
      [{ title: hole() }],
    ])).toThrow(PlanEmitError)
  })

  it('function inputs throw (holes are the only dynamic values allowed)', () => {
    expect(() => emitRoutePlan([[{ title: () => 'x' }]])).toThrow(PlanEmitError)
    expect(() => emitRoutePlan([[{ titleTemplate: (t?: string) => t || 'x' }]])).toThrow(PlanEmitError)
  })

  it('lone titleTemplate folds to a title with d "title" so runtime titles override', () => {
    const { plan } = emitRoutePlan([[{ titleTemplate: 'Site' }]])
    expect(plan).toEqual([[100, 'title', '<title>Site</title>']])
    const head = createHead()
    head.push(plan)
    head.push({ title: 'Page' })
    expect(renderSSRHead(head).headTags).toContain('<title>Page</title>')
  })
})

describe('planToCode', () => {
  it('round-trips through eval', () => {
    const { plan } = emitRoutePlan(ENTRIES.map(([input, opts]) => [input, opts] as [Record<string, any>, EntryOptions?]))
    const code = planToCode(plan)
    // eslint-disable-next-line no-eval
    expect(eval(code)).toEqual(plan)
    // hole-free plans are also valid JSON
    expect(JSON.parse(code)).toEqual(plan)
  })

  it('round-trips a hole-bearing plan and a fills pair', () => {
    const { plan } = emitEntryPlan({ title: hole(), meta: [{ name: 'description', content: hole() }] })
    const code = planToCode(plan, { fills: ['"About"', '"Desc"'] })
    // eslint-disable-next-line no-eval
    const [p, opts] = eval(code)
    expect(p).toEqual(plan)
    expect(opts).toEqual({ fills: ['About', 'Desc'] })
  })

  it('emits compact code for the fixtures page', () => {
    const { plan } = emitRoutePlan(ENTRIES.map(([input, opts]) => [input, opts] as [Record<string, any>, EntryOptions?]))
    const code = planToCode(plan)
    const objectSource = JSON.stringify(ENTRIES.map(([input, opts]) => [input, opts]))
    // sealed plan should stay in the same size class as the object literals it replaces
    expect(code.length).toBeLessThan(objectSource.length * 1.5)
    expect(code.startsWith('[[')).toBe(true)
    expect(code).not.toContain('undefined')
  })
})
