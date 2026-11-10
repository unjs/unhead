import type { HeadTag } from '../../../src/types'
import { describe, expect, it } from 'vitest'
import { compileTags, createHead, dynamicValue, renderSSRHead } from '../../../src/compiled/server'
import { CanonicalPlugin, InferSeoMetaPlugin, MinifyPlugin, TemplateParamsPlugin } from '../../../src/plugins'
import { createHead as createV3Head, renderSSRHead as renderV3, transformHtmlTemplate as transformV3 } from '../../../src/server'
import { normalizeEntryToTags, resolveTags } from '../../../src/utils'
import { toCompiledTags } from './util'

function compiledTags(input: any) {
  const result = compileTags(input)
  if (result._tag !== 'Ok')
    throw new Error(result.reason)
  // a fresh array per call, so one test cannot reach another through the memo
  return [...result.tags]
}

const page: any = {
  title: 'Page',
  titleTemplate: '%s %separator %siteName',
  templateParams: { siteName: 'Site' },
  meta: [{ name: 'description', content: 'Welcome to %siteName' }],
  link: [{ rel: 'canonical', href: 'https://example.com/a' }],
}

describe('a dynamic value in style content', () => {
  // `@import` raises the weight of a style, which the compiled tags fixed at build time
  it.each(['a{color:red}', '@import url(a.css);', ''])('renders %j like v3', (value) => {
    const template = compileTags({ link: [{ rel: 'stylesheet', href: '/a.css' }], style: [{ innerHTML: dynamicValue(0), id: 'colors' }] }, { dynamicValues: 1 })
    if (template._tag !== 'Ok')
      throw new Error(template.reason)
    const input = { link: [{ rel: 'stylesheet', href: '/a.css' }], style: [{ innerHTML: value, id: 'colors' }] }
    for (let i = 0; i < 2; i++) {
      const head = createHead()
      head.push(template.tags, { values: [value] })
      const v3 = createV3Head()
      v3.push(input as any)
      expect(renderSSRHead(head)).toEqual(renderV3(v3))
    }
  })

  // the static text and the values can each hold a part of `@import`
  it.each([
    ['static text, then a value', ['@imp', 0, ''], ['ort url(/a.css);']],
    ['a value, then static text', ['', 0, 'ort url(/a.css);'], ['@imp']],
    ['a value that ends with @', ['a{}', 0, 'import url(/a.css);'], ['@']],
    ['two values', ['', 0, '', 1, ''], ['@imp', 'ort url(/a.css);']],
    ['a value, static text, a value', ['', 0, 'po', 1, ''], ['@im', 'rt url(/a.css);']],
    ['no @import', [':root{--c:', 0, '}'], ['red']],
    ['an @ that starts another rule', ['', 0, 'media print{a{}}'], ['@']],
  ])('renders an @import split over %s like v3', (_, parts, values) => {
    const text = (value: (index: number) => string) => parts.map(part => typeof part === 'number' ? value(part) : part).join('')
    const input = (innerHTML: string) => ({ script: [{ innerHTML: 'x()' }], style: [{ key: 's', innerHTML }] })
    const template = compileTags(input(text(dynamicValue)), { dynamicValues: values.length })
    const final = input(text(index => values[index]!))
    for (const loose of [false, true]) {
      for (let i = 0; i < 2; i++) {
        const head = createHead()
        // the build keeps the head input when it cannot compile
        if (template._tag === 'Ok')
          head.push(template.tags, { values })
        else
          head.push(final as any)
        const v3 = createV3Head()
        v3.push(final as any)
        if (loose) {
          head.push({ meta: [{ name: 'loose', content: 'a' }] })
          v3.push({ meta: [{ name: 'loose', content: 'a' }] })
        }
        expect(renderSSRHead(head)).toEqual(renderV3(v3))
      }
    }
  })
})

describe('memo tier', () => {
  it('serves a sequence of compiled tags from the memo', () => {
    const a = compiledTags({ title: 'a' })
    const render = () => {
      const head = createHead({ disableDefaults: true })
      head.push(a)
      return renderSSRHead(head).headTags
    }
    expect(render()).toBe('<title>a</title>')
    // only a memo can still return the old value after the compiled tags changed
    ;(a[0] as any)[4] = { textContent: 'changed' }
    expect(render()).toBe('<title>a</title>')
  })

  it('returns a fresh payload per render', () => {
    const a = compiledTags({ title: 'a' })
    const render = () => {
      const head = createHead({ disableDefaults: true })
      head.push(a)
      return renderSSRHead(head)
    }
    const first = render()
    first.headTags = 'mutated'
    expect(render().headTags).toBe('<title>a</title>')
  })

  it('keys the memo on the order of compiled tags, line breaks, and template params', () => {
    const a = compiledTags({ title: 'a', meta: [{ name: 'x', content: '%y' }] })
    const b = compiledTags({ title: 'b', meta: [{ name: 'z', content: '1' }], templateParams: { y: 'yy' } })
    const render = (compiledTagSets: any[], options: any = {}, tp = false) => {
      const head = createHead({ disableDefaults: true, plugins: tp ? [TemplateParamsPlugin] : [] })
      compiledTagSets.forEach(p => head.push(p))
      return renderSSRHead(head, options).headTags
    }
    for (let i = 0; i < 2; i++) {
      expect(render([a, b])).toBe('<title>b</title>\n<meta name="x" content="%y">\n<meta name="z" content="1">')
      expect(render([b, a])).toBe('<title>a</title>\n<meta name="z" content="1">\n<meta name="x" content="%y">')
      expect(render([a, b], { omitLineBreaks: true })).toBe('<title>b</title><meta name="x" content="%y"><meta name="z" content="1">')
      expect(render([a, b], {}, true)).toBe('<title>b</title>\n<meta name="x" content="yy">\n<meta name="z" content="1">')
    }
  })
})

describe('value tier', () => {
  it('serves structure from the memo and takes each value fresh', () => {
    const result = compileTags({ title: dynamicValue(0), meta: [{ name: 'd', content: dynamicValue(1) }] }, { dynamicValues: 2 })
    const a = result._tag === 'Ok' ? [...result.tags] : []
    const render = (values: unknown[]) => {
      const head = createHead({ disableDefaults: true })
      head.push(a, { values })
      return renderSSRHead(head).headTags
    }
    expect(render(['one', 'two'])).toBe('<title>one</title>\n<meta name="d" content="two">')
    // a static change stays hidden behind the memo while values still apply
    ;(a[1] as any)[1] = { name: 'changed', content: dynamicValue(1) }
    expect(render(['three', 'four'])).toBe('<title>three</title>\n<meta name="d" content="four">')
  })

  it('cannot be used for injection', () => {
    const result = compileTags({
      title: dynamicValue(0),
      meta: [{ name: 'd', content: dynamicValue(1) }],
      script: [{ key: 'k', innerHTML: dynamicValue(2) }, { key: 'j', type: 'application/json', innerHTML: dynamicValue(3) }],
      noscript: [{ key: 'n', innerHTML: dynamicValue(4) }],
    }, { dynamicValues: 5 })
    const a = result._tag === 'Ok' ? result.tags : []
    const attack = [
      '</title><script>alert(1)</script>',
      '"><script>alert(1)</script>',
      '</script><script>alert(1)</script>',
      '</script><script>alert(1)</script>',
      '</noscript><script>alert(1)</script>',
    ]
    const render = () => {
      const head = createHead({ disableDefaults: true })
      head.push(a, { values: attack })
      return renderSSRHead(head).headTags
    }
    // the first render builds the memo with v3 rules, the second joins the pieces
    for (const html of [render(), render()]) {
      expect(html).toContain('<title>&lt;&#x2F;title&gt;&lt;script&gt;alert(1)&lt;&#x2F;script&gt;</title>')
      expect(html).toContain('content="&quot;><script>alert(1)</script>"')
      expect(html).toContain('<script data-hid="k"><\\/script><script>alert(1)<\\/script></script>')
      expect(html).toContain('<script type="application/json" data-hid="j">\\u003C/script>\\u003Cscript>alert(1)\\u003C/script></script>')
      expect(html).toContain('<noscript data-hid="n"><\\/noscript><script>alert(1)</script></noscript>')
    }
  })

  it('cannot use a value to reach another dynamic value', () => {
    const result = compileTags({ title: `${dynamicValue(0)} ${dynamicValue(1)}` }, { dynamicValues: 2 })
    const a = result._tag === 'Ok' ? result.tags : []
    const head = createHead({ disableDefaults: true })
    head.push(a, { values: [dynamicValue(1), 'secret'] })
    expect(renderSSRHead(head).headTags).toBe(`<title>${dynamicValue(1)} secret</title>`)
    expect(renderSSRHead(head).headTags).toBe(`<title>${dynamicValue(1)} secret</title>`)
  })

  it('sets the title state to the value', () => {
    const result = compileTags({ title: dynamicValue(0) }, { dynamicValues: 1 })
    const a = result._tag === 'Ok' ? result.tags : []
    const head = createHead({ disableDefaults: true, plugins: [TemplateParamsPlugin] })
    head.push(a, { values: ['first'] })
    renderSSRHead(head)
    const next = createHead({ disableDefaults: true, plugins: [TemplateParamsPlugin] })
    next.push(a, { values: ['second'] })
    renderSSRHead(next)
    expect(next._title).toBe('second')
    expect(next._templateParams?.pageTitle).toBe('second')
  })
})

describe('full runtime tier', () => {
  it('runs a listener registered through head.hooks', () => {
    const run = (head: any) => {
      head.push(toCompiledTags({ title: 'a', meta: [{ name: 'x', content: 'y' }] }))
      const seen: string[] = []
      head.hooks.hook('tags:resolve', ({ tags }: { tags: HeadTag[] }) => {
        seen.push(...tags.map(tag => tag.tag))
        tags.find(tag => tag.tag === 'title')!.textContent = 'hooked'
      })
      return { html: renderSSRHead(head), seen }
    }
    const v3 = createV3Head({ disableDefaults: true })
    v3.push({ title: 'a', meta: [{ name: 'x', content: 'y' }] })
    const seen: string[] = []
    v3.hooks.hook('tags:resolve', ({ tags }: any) => {
      seen.push(...tags.map((tag: HeadTag) => tag.tag))
      tags.find((tag: HeadTag) => tag.tag === 'title')!.textContent = 'hooked'
    })
    expect(run(createHead({ disableDefaults: true }))).toEqual({ html: renderV3(v3), seen })
  })

  it('runs listeners from options.hooks, every ssr hook, and shouldRender', () => {
    const hooks = () => ({
      'ssr:beforeRender': (ctx: any) => {
        ctx.shouldRender = false
      },
    })
    const v3 = createV3Head({ disableDefaults: true, hooks: hooks() })
    v3.push({ title: 'a' })
    const head = createHead({ disableDefaults: true, hooks: hooks() })
    head.push(toCompiledTags({ title: 'a' }))
    expect(renderSSRHead(head)).toEqual(renderV3(v3))
    expect(renderSSRHead(head).headTags).toBe('')
  })

  it('returns to the fast tiers once a listener is gone', () => {
    const a = compiledTags({ title: 'a' })
    const head = createHead({ disableDefaults: true })
    head.push(a)
    const remove = head.hooks.hook('ssr:render', (ctx: any) => {
      ctx.tags.push({ tag: 'meta', props: { name: 'added', content: 'x' } })
    })
    expect(renderSSRHead(head).headTags).toContain('added')
    remove()
    expect(renderSSRHead(head).headTags).toBe('<title>a</title>')
  })

  it.each([
    ['template params before a plugin', () => [TemplateParamsPlugin, CanonicalPlugin({ canonicalHost: 'https://x.dev' })]],
    ['template params after a plugin', () => [CanonicalPlugin({ canonicalHost: 'https://x.dev' }), TemplateParamsPlugin]],
    ['infer seo meta', () => [TemplateParamsPlugin, InferSeoMetaPlugin()]],
    ['minify', () => [TemplateParamsPlugin, MinifyPlugin()]],
  ])('keeps v3 output and hook order: %s', (_, plugins) => {
    const input: any = { ...page, link: [{ rel: 'canonical', href: '/rel' }], style: ['a { color: red; }'], meta: [...page.meta, { property: 'og:image', content: '/a.png' }] }
    const v3 = createV3Head({ plugins: plugins() })
    v3.push(input)
    const head = createHead({ plugins: plugins() })
    head.push(toCompiledTags(input))
    expect(renderSSRHead(head)).toEqual(renderV3(v3))
    expect(head.render()).toEqual(v3.render())
  })

  it('keeps a listener registered before and after template params in v3 order', () => {
    const order = (create: any, push: (head: any) => void) => {
      const calls: string[] = []
      const head = create({
        disableDefaults: true,
        hooks: { 'tags:resolve': () => calls.push('option') },
        plugins: [TemplateParamsPlugin, { key: 'after', hooks: { 'tags:resolve': () => calls.push('plugin') } }],
      })
      push(head)
      const titleWhenListenerRan: unknown[] = []
      head.hooks.hook('tags:resolve', ({ tags }: { tags: HeadTag[] }) => titleWhenListenerRan.push(tags.find(tag => tag.tag === 'title')?.textContent))
      return { html: head.render(), calls, titleWhenListenerRan }
    }
    const input = { title: '%a', templateParams: { a: 'b' } }
    expect(order(createHead, head => head.push(toCompiledTags(input)))).toEqual(order(createV3Head, head => head.push(input)))
  })

  it('uses the full runtime for a custom weight, resolved tags, and a dynamic resolver', () => {
    const input = { title: 'a', meta: [{ name: 'x', content: 'y' }], script: [{ src: '/a.js' }] }
    const tagWeight = (tag: HeadTag) => tag.tag === 'meta' ? -100 : 100
    const options = { disableDefaults: true, tagWeight }
    const v3 = createV3Head(options)
    v3.push(input)
    const head = createHead(options)
    head.push(toCompiledTags(input))
    expect(head.render()).toEqual(v3.render())
    expect(renderSSRHead(head)).toEqual(renderV3(v3))

    const other = createHead({ disableDefaults: true })
    other.push(toCompiledTags(input))
    const v3Other = createV3Head({ disableDefaults: true })
    v3Other.push(input)
    expect(renderSSRHead(other, { tagWeight })).toEqual(renderV3(v3Other, { tagWeight }))
    const resolvedTags: HeadTag[] = [{ tag: 'meta', props: { name: 'only', content: 'x' } }]
    expect(renderSSRHead(other, { resolvedTags })).toEqual(renderV3(v3Other, { resolvedTags }))

    const upper = (_: string | undefined, value: unknown) => typeof value === 'string' ? value.toUpperCase() : value
    const dynamicV3 = createV3Head({ disableDefaults: true, propResolvers: [upper] })
    dynamicV3.push(input)
    const dynamic = createHead({ disableDefaults: true, propResolvers: [upper] })
    dynamic.push(toCompiledTags(input))
    expect(renderSSRHead(dynamic)).toEqual(renderV3(dynamicV3))
  })

  it('runs an event handler and a function input through the loose path', () => {
    const input: any = () => ({ title: 'fn', script: [{ src: '/a.js', onload: () => {} }] })
    const v3 = createV3Head({ disableDefaults: true })
    v3.push(input)
    const head = createHead({ disableDefaults: true })
    head.push(input)
    head.push(toCompiledTags({ meta: [{ name: 'x', content: 'y' }] }))
    v3.push({ meta: [{ name: 'x', content: 'y' }] })
    expect(renderSSRHead(head)).toEqual(renderV3(v3))
  })

  it('honors a plugin with the template params key that is not the real one', () => {
    const custom = { key: 'template-params', hooks: { 'tags:resolve': ({ tags }: any) => tags.push({ tag: 'meta', props: { name: 'custom', content: 'x' } }) } }
    const head = createHead({ disableDefaults: true, plugins: [custom] })
    head.push(compiledTags({ title: 'a' }))
    expect(renderSSRHead(head).headTags).toContain('custom')
  })
})

describe('native template params', () => {
  it('does not force the full runtime tier', () => {
    const a = compiledTags(page)
    const render = () => {
      const head = createHead({ plugins: [TemplateParamsPlugin] })
      head.push(a)
      return renderSSRHead(head).headTags
    }
    const first = render()
    ;(a[0] as any)[4] = { textContent: 'changed' }
    expect(render()).toBe(first)
  })

  it('keeps head state on every tier', () => {
    const read = (head: any) => ({ t: head._title, tt: head._titleTemplate, p: head._templateParams, s: head._separator })
    const v3 = createV3Head({ plugins: [TemplateParamsPlugin] })
    v3.push(page)
    renderV3(v3)
    const a = compiledTags(page)
    for (let i = 0; i < 2; i++) {
      const head = createHead({ plugins: [TemplateParamsPlugin] })
      head.push(a)
      renderSSRHead(head)
      expect(read(head)).toEqual(read(v3))
    }
    const mixed = createHead({ plugins: [TemplateParamsPlugin] })
    mixed.push(page)
    renderSSRHead(mixed)
    expect(read(mixed)).toEqual(read(v3))
  })

  it('never writes to compiled tags', () => {
    const a = compiledTags(page)
    const copy = JSON.stringify(a)
    for (const loose of [false, true]) {
      const head = createHead({ plugins: [TemplateParamsPlugin] })
      head.push(a)
      if (loose)
        head.push({ meta: [{ name: 'l', content: '%siteName' }] })
      renderSSRHead(head)
    }
    expect(JSON.stringify(a)).toBe(copy)
  })

  it('renders mixed entries repeatedly with stable output', () => {
    const a = compiledTags(page)
    const expected = () => {
      const v3 = createV3Head({ plugins: [TemplateParamsPlugin] })
      v3.push(page)
      v3.push({ meta: [{ name: 'l', content: '%siteName' }] })
      return renderV3(v3)
    }
    for (let i = 0; i < 3; i++) {
      const head = createHead({ plugins: [TemplateParamsPlugin] })
      head.push(a)
      head.push({ meta: [{ name: 'l', content: '%siteName' }] })
      expect(renderSSRHead(head)).toEqual(expected())
    }
  })
})

describe('entries', () => {
  it('stay v3 shaped, with values out of the options', () => {
    const input = { title: 'a', meta: [{ name: 'x', content: 'y' }] }
    const head = createHead({ disableDefaults: true })
    const { _i } = head.push(toCompiledTags(input), { values: [], tagPosition: 'bodyClose' } as any)
    const entry = head.entries.get(_i)!
    expect(entry._i).toBe(_i)
    expect(entry.options).toEqual({ tagPosition: 'bodyClose' })
    expect(entry.input).toEqual(input)
    expect(entry.input).toBe(entry.input)
  })

  it('work for a reader that walks entry input like the Nuxt island handler', () => {
    const inputs = [{ title: 'a', link: [{ rel: 'icon', href: '/i' }], htmlAttrs: { lang: 'en' } }, { meta: [{ name: 'x', content: 'y' }], link: [{ rel: 'a', href: '/b' }] }]
    const head = createHead({ disableDefaults: true })
    inputs.forEach(input => head.push(toCompiledTags(input)))
    const islandHead: Record<string, any> = {}
    for (const entry of head.entries.values()) {
      for (const [key, value] of Object.entries(entry.input as object)) {
        const current = islandHead[key]
        if (Array.isArray(current))
          current.push(...value)
        else
          islandHead[key] = value
      }
    }
    expect(islandHead).toEqual({ title: 'a', htmlAttrs: { lang: 'en' }, link: [{ rel: 'icon', href: '/i' }, { rel: 'a', href: '/b' }], meta: [{ name: 'x', content: 'y' }] })
  })

  it('accept an input written back by a reader', () => {
    const head = createHead({ disableDefaults: true })
    const { _i } = head.push(compiledTags({ title: 'a' }))
    head.entries.get(_i)!.input = { title: 'written' }
    expect(renderSSRHead(head).headTags).toBe('<title>written</title>')
  })

  it('rebuild compiled tags for resolveTags with values and the template params rules', () => {
    const result = compileTags({ title: dynamicValue(0), titleTemplate: '%s %separator %siteName', link: [{ rel: 'preload', key: 'k', as: 'font', href: `%cdn/${dynamicValue(1)}` }], templateParams: { siteName: 's', cdn: 'https://c' } }, { dynamicValues: 2 })
    const head = createHead({ disableDefaults: true, plugins: [TemplateParamsPlugin] })
    head.push(result._tag === 'Ok' ? result.tags : [], { values: ['t', 'f.woff'] })
    const tags = resolveTags(head)
    expect(tags.find(tag => tag.tag === 'title')!.textContent).toBe('t | s')
    expect(tags.find(tag => tag.tag === 'link')!.props.href).toBe('https://c/f.woff')
    expect(renderSSRHead(head).headTags).toBe('<title>t | s</title>\n<link rel="preload" as="font" href="https://c/f.woff" data-hid="k">')
  })

  it('stay on the fast tiers after a read through resolveTags', () => {
    const a = compiledTags(page)
    const head = createHead({ plugins: [TemplateParamsPlugin] })
    head.push(a)
    const expected = renderSSRHead(head)
    resolveTags(head)
    expect(renderSSRHead(head)).toEqual(expected)
  })

  it('normalize to the tags of the input', () => {
    const input: any = { title: 'a', meta: [{ name: 'x', content: 'y' }], link: [{ rel: 'preload', key: 'k', as: 'font', href: '/f' }], htmlAttrs: { class: 'a b', style: 'c:d' } }
    const head = createHead({ disableDefaults: true })
    const { _i } = head.push(toCompiledTags(input))
    expect(normalizeEntryToTags(head.entries.get(_i)!.input, [])).toEqual(normalizeEntryToTags(input, []))
  })

  it('patch to compiled tags, to loose input, and after dispose', () => {
    const v3 = createV3Head({ disableDefaults: true })
    const head = createHead({ disableDefaults: true })
    const compiled = head.push(compiledTags({ title: 'a' }))
    const loose = v3.push({ title: 'a' })
    v3.push({ title: 'b' })
    head.push(compiledTags({ title: 'b' }))
    expect(renderSSRHead(head)).toEqual(renderV3(v3))
    compiled.patch(compiledTags({ meta: [{ name: 'x', content: '1' }] }))
    loose.patch({ meta: [{ name: 'x', content: '1' }] })
    expect(renderSSRHead(head)).toEqual(renderV3(v3))
    compiled.patch({ meta: [{ name: 'x', content: '2' }] })
    loose.patch({ meta: [{ name: 'x', content: '2' }] })
    expect(renderSSRHead(head)).toEqual(renderV3(v3))
    compiled.dispose()
    loose.dispose()
    expect(renderSSRHead(head)).toEqual(renderV3(v3))
    compiled.patch(compiledTags({ link: [{ rel: 'x', href: '/y' }] }))
    loose.patch({ link: [{ rel: 'x', href: '/y' }] } as any)
    expect(renderSSRHead(head)).toEqual(renderV3(v3))
  })

  it('patch keeps the entry object, as v3 does', () => {
    const head = createHead({ disableDefaults: true })
    const active = head.push(compiledTags({ title: 'a' }))
    const entry = head.entries.get(active._i)
    active.patch({ title: 'b' })
    expect(head.entries.get(active._i)).toBe(entry)
    expect(entry!.input).toEqual({ title: 'b' })
    active.patch(compiledTags({ title: 'c' }))
    expect(head.entries.get(active._i)).toBe(entry)
    expect(renderSSRHead(head).headTags).toBe('<title>c</title>')
  })

  it('runs a value function once, on the first render', () => {
    const result = compileTags({ title: dynamicValue(0) }, { dynamicValues: 1 })
    const a = result._tag === 'Ok' ? result.tags : []
    const head = createHead({ disableDefaults: true })
    let calls = 0
    head.push(a, { values: () => [`render ${++calls}`] })
    expect(calls).toBe(0)
    expect(renderSSRHead(head).headTags).toBe('<title>render 1</title>')
    expect(renderSSRHead(head).headTags).toBe('<title>render 1</title>')
    expect(calls).toBe(1)
  })

  it('patch values', () => {
    const result = compileTags({ title: dynamicValue(0) }, { dynamicValues: 1 })
    const a = result._tag === 'Ok' ? result.tags : []
    const head = createHead({ disableDefaults: true })
    const entry = head.push(a, { values: ['one'] })
    expect(renderSSRHead(head).headTags).toBe('<title>one</title>')
    entry.patch(a, { values: ['two'] })
    expect(renderSSRHead(head).headTags).toBe('<title>two</title>')
  })
})

describe('entry points', () => {
  it('renders a full runtime head', () => {
    const v3 = createV3Head({ disableDefaults: true, plugins: [TemplateParamsPlugin] })
    v3.push(page)
    expect(renderSSRHead(v3)).toEqual(renderV3(v3))
  })

  it('a compiled head renders through the v3 renderSSRHead', () => {
    const v3 = createV3Head({ plugins: [TemplateParamsPlugin] })
    v3.push(page)
    const head = createHead({ plugins: [TemplateParamsPlugin] })
    head.push(toCompiledTags(page))
    expect(renderV3(head as any)).toEqual(renderV3(v3))
  })

  it('transformHtmlTemplate of unhead/server works with compiled entries', () => {
    const html = '<html lang="fr"><head><title>Template</title><meta name="x" content="y"></head><body>b</body></html>'
    const v3 = createV3Head({ plugins: [TemplateParamsPlugin] })
    v3.push(page)
    const head = createHead({ plugins: [TemplateParamsPlugin] })
    head.push(toCompiledTags(page))
    expect(transformV3(head as any, html)).toBe(transformV3(v3, html))
  })
})

describe('memo with InferSeoMetaPlugin', () => {
  const inferPlugins = () => [TemplateParamsPlugin, InferSeoMetaPlugin()]

  it('serves a sequence of compiled tags from the memo', () => {
    const result = compileTags({ ...page, title: dynamicValue(0), meta: [...page.meta, { property: 'og:image', content: '/a.png' }] }, { dynamicValues: 1 })
    const a: any[] = result._tag === 'Ok' ? [...result.tags] : []
    const render = () => {
      const head = createHead({ plugins: inferPlugins() })
      head.push(a, { values: ['Page'] })
      return renderSSRHead(head)
    }
    const v3 = createV3Head({ plugins: inferPlugins() })
    v3.push({ ...page, meta: [...page.meta, { property: 'og:image', content: '/a.png' }] })
    const expected = renderV3(v3)
    expect(render()).toEqual(expected)
    // only a memo can still return the old value after the compiled tags changed
    const image = a.findIndex(tag => tag[1]?.property === 'og:image')
    a[image] = ['meta', { property: 'og:image', content: '/changed.png' }, ...a[image].slice(2)]
    expect(render()).toEqual(expected)
  })

  it.each([
    ['a title and an image', ['Page', 'About %siteName', '/a.png']],
    ['another title', ['Other "quoted" page', 'Second', '/b.png']],
    ['an empty image', ['Page', 'About', '']],
    ['a blank image', ['Page', 'About', ' ']],
    ['an empty description', ['Page', '', '/a.png']],
    ['a number title', [42, 'About', '/a.png']],
    ['a missing title', [undefined, 'About', '/a.png']],
  ])('renders values like v3: %s', (_, values) => {
    const template = compileTags({
      title: dynamicValue(0),
      titleTemplate: '%s %separator %siteName',
      templateParams: { siteName: 'Site' },
      meta: [{ name: 'description', content: dynamicValue(1) }, { property: 'og:image', content: dynamicValue(2) }],
    }, { dynamicValues: 3 })
    if (template._tag !== 'Ok')
      throw new Error(template.reason)
    const input = {
      title: values[0],
      titleTemplate: '%s %separator %siteName',
      templateParams: { siteName: 'Site' },
      meta: [{ name: 'description', content: values[1] }, { property: 'og:image', content: values[2] }],
    }
    // warm the memo with other values first, with and without template params
    const runs: unknown[][] = [['Warm', 'Warm', '/w.png'], values, values]
    for (const [run, tp] of runs.flatMap(run => [[run, true], [run, false]] as const)) {
      const plugins = () => tp ? inferPlugins() : [InferSeoMetaPlugin()]
      const head = createHead({ plugins: plugins() })
      head.push(template.tags, { values: run })
      const v3 = createV3Head({ plugins: plugins() })
      v3.push({ ...input, title: run[0], meta: [{ name: 'description', content: run[1] }, { property: 'og:image', content: run[2] }] } as any)
      expect(renderSSRHead(head)).toEqual(renderV3(v3))
    }
  })

  // a function may leave one text as it is and change the next, so no render reuses its output
  it.each([
    ['ogTitle', { ogTitle: (title?: string) => title?.replace(/ \| .*$/, '') ?? '' }],
    ['ogDescription', { ogDescription: (description?: string) => description?.toUpperCase() ?? '' }],
  ])('runs an %s function on a dynamic value', (_, options) => {
    const template = compileTags({ title: dynamicValue(0), meta: [{ name: 'description', content: dynamicValue(1) }] }, { dynamicValues: 2 })
    if (template._tag !== 'Ok')
      throw new Error(template.reason)
    for (const values of [['Warm', 'Warm'], ['Post | Blog', 'About'], ['Post | Blog', 'About']]) {
      const head = createHead({ plugins: [InferSeoMetaPlugin(options)] })
      head.push(template.tags, { values })
      const v3 = createV3Head({ plugins: [InferSeoMetaPlugin(options)] })
      v3.push({ title: values[0], meta: [{ name: 'description', content: values[1] }] })
      expect(renderSSRHead(head)).toEqual(renderV3(v3))
    }
  })

  it('calls a title function on every render', () => {
    const a = compiledTags({ title: 'Page' })
    const render = (create: any, render: any, input: any = a) => {
      let count = 0
      const head = create({ plugins: [InferSeoMetaPlugin({ ogTitle: title => `${title} ${++count}` })] })
      head.push(input)
      render(head)
      return render(head).headTags
    }
    expect(render(createHead, renderSSRHead)).toBe(render(createV3Head, renderV3, { title: 'Page' }))
    expect(render(createHead, renderSSRHead)).toContain('Page 2')
  })

  it('keeps a stale title template of an earlier render, as v3 does', () => {
    const run = (create: any, render: any, input: any) => {
      const head = create({ plugins: [InferSeoMetaPlugin()] })
      const entry = head.push(input({ title: 'Page', titleTemplate: '%s - Site' }))
      render(head)
      entry.patch(input({ title: 'Page' }))
      return render(head).headTags
    }
    run(createHead, renderSSRHead, compiledTags)
    expect(run(createHead, renderSSRHead, compiledTags)).toBe(run(createV3Head, renderV3, (i: any) => i))
  })
})
