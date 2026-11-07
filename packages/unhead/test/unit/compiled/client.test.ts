import type { ResolvableHead } from '../../../src/types'
import { describe, expect, it, vi } from 'vitest'
import { compileTags, dynamicValue } from '../../../src/compiled/compile'
import { createLazyHead, lazyTemplateParams } from '../../../src/lazy'
import { TemplateParamsPlugin } from '../../../src/plugins'
import { createPair, settle, ssrDom, toCompiledTags } from './client-util'

const v3Runtime = vi.hoisted(() => ({ heads: new Set<unknown>(), fail: 0 }))
vi.mock('../../../src/lazy/runtime', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/lazy/runtime')>()
  return {
    ...actual,
    upgradeHead: (...args: Parameters<typeof actual.upgradeHead>) => {
      v3Runtime.heads.add(args[0])
      if (v3Runtime.fail) {
        v3Runtime.fail--
        return Promise.reject(new Error('chunk failed'))
      }
      return actual.upgradeHead(...args)
    },
  }
})

function compile(input: unknown, dynamicValues?: number): any {
  const result = compileTags(input, { dynamicValues })
  if (result._tag !== 'Ok')
    throw new Error(result.reason)
  return result.tags
}

const page: ResolvableHead = {
  title: 'Home',
  titleTemplate: '%s | Site',
  htmlAttrs: { lang: 'en', class: 'a b' },
  meta: [{ name: 'description', content: 'desc' }, { property: 'og:image', content: '/1.png' }, { property: 'og:image', content: '/2.png' }],
  link: [{ rel: 'canonical', href: '/home' }, { rel: 'icon', href: '/favicon.ico' }],
  script: [{ src: '/app.js', defer: true }, { key: 'ld', type: 'application/ld+json', innerHTML: { a: '</script>' } }],
}

async function loaded(input: ResolvableHead, options: Parameters<typeof createLazyHead>[0] = {}) {
  const dom = ssrDom([{ input }], 'none')
  const head = createLazyHead({ document: dom.window.document, ...options })
  const entry = head.push(toCompiledTags(input))
  head.render()
  await head.load()
  await settle()
  return { dom, head, entry }
}

describe('compiled entries in the eager shell', () => {
  it('stores compiled tags with their values and touches nothing', async () => {
    const dom = ssrDom([{ input: page }], 'none')
    const before = dom.serialize()
    const head = createLazyHead({ document: dom.window.document })
    const compiledTags = compile({ title: dynamicValue(0) }, 1)
    const entry = head.push(compiledTags, { values: ['x'], tagPriority: 'low' })
    head.render()
    head.blockLoad()
    entry.patch(compiledTags, { values: ['y'] })
    await settle()
    expect(dom.serialize()).toBe(before)
    const stored = head.entries.get(entry._i)!
    expect(stored._pending).toBe(compiledTags)
    expect(stored.options).toEqual({ values: ['y'], tagPriority: 'low' })
  })
})

describe('compiled runtime', () => {
  it('adopts the server head with no DOM change and no v3 runtime', async () => {
    const dom = ssrDom([{ input: page }], 'none')
    const before = dom.serialize()
    const nodes = [...dom.window.document.head.childNodes]
    const head = createLazyHead({ document: dom.window.document })
    head.push(toCompiledTags(page))
    head.render()
    await head.load()
    await settle()
    expect(dom.serialize()).toBe(before)
    expect([...dom.window.document.head.childNodes]).toEqual(nodes)
    expect(v3Runtime.heads.has(head)).toBe(false)
  })

  it('keeps an identical script element, so it never runs again', async () => {
    const { dom, head } = await loaded(page)
    const script = dom.window.document.querySelector('script[src="/app.js"]')
    head.push(toCompiledTags({ title: 'Next' }))
    await settle()
    expect(dom.window.document.title).toBe('Next | Site')
    expect(dom.window.document.querySelector('script[src="/app.js"]')).toBe(script)
  })

  it('updates attributes in place and never moves an element', async () => {
    const { dom, entry } = await loaded(page)
    const order = [...dom.window.document.head.children]
    entry.patch(toCompiledTags({ ...page, meta: [{ name: 'description', content: 'changed' }] }))
    await settle()
    const head = dom.window.document.head
    expect(head.querySelector('meta[name="description"]')).toBe(order.find(el => el.getAttribute('name') === 'description'))
    expect(head.querySelector('meta[name="description"]')!.getAttribute('content')).toBe('changed')
    expect(head.querySelectorAll('meta[property="og:image"]')).toHaveLength(0)
    expect([...head.children].map(el => order.indexOf(el)).filter(i => i !== -1)).toEqual([...head.children].map(el => order.indexOf(el)).filter(i => i !== -1).sort((a, b) => a - b))
  })

  it('restores the server title, attributes, and classes when an entry goes', async () => {
    const dom = ssrDom([{ input: { title: 'Server' } }], 'none')
    dom.window.document.documentElement.setAttribute('data-ssr', 'keep')
    const head = createLazyHead({ document: dom.window.document })
    head.push(toCompiledTags({ title: 'Server' }))
    head.render()
    await head.load()
    await settle()
    const entry = head.push(toCompiledTags({ title: 'Client', htmlAttrs: { class: 'x', dir: 'rtl' } }))
    await settle()
    expect(dom.window.document.documentElement.outerHTML).toContain('class="x"')
    entry.dispose()
    await settle()
    expect(dom.window.document.title).toBe('Server')
    expect(dom.window.document.documentElement.getAttribute('class')).toBe('')
    expect(dom.window.document.documentElement.hasAttribute('dir')).toBe(false)
    expect(dom.window.document.documentElement.getAttribute('data-ssr')).toBe('keep')
  })

  it('adopts a body element before a head element with the same key, as v3 does', async () => {
    const input = { script: [{ src: '/a.js' }] }
    const pair = createPair([{ input }], 'none')
    for (const dom of [pair.v3Dom, pair.compiledDom]) {
      const copy = dom.window.document.createElement('script')
      copy.setAttribute('src', '/a.js')
      dom.window.document.body.appendChild(copy)
    }
    const entry = pair.push(input)
    await pair.render()
    entry.patch({ script: [{ src: '/a.js', defer: true }] })
    await pair.render()
    expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
  })

  it('clears content it set when a reused element drops it', async () => {
    const pair = createPair([{ input: { noscript: [{ key: 'n', innerHTML: 'a' }] } }], 'none')
    const entry = pair.push({ noscript: [{ key: 'n', innerHTML: 'a' }] })
    await pair.render()
    entry.patch({ noscript: [{ key: 'n', innerHTML: 'b' }] })
    await pair.render()
    entry.patch({ noscript: [{ 'key': 'n', 'data-x': '1' }] })
    await pair.render()
    expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
    expect(pair.compiledDom.window.document.querySelector('noscript')!.innerHTML).toBe('')
  })

  it('adopts a keyed meta through data-hid and a keyless tag with a class', async () => {
    const input: any = { meta: [{ 'name': 'x', 'content': '1', 'key': 'k', 'data-hid': 'k' }], link: [{ rel: 'preload', href: '/a', class: 'c' }] }
    const pair = createPair([{ input }], 'none')
    const entry = pair.push(input)
    await pair.render()
    entry.patch({ ...input, meta: [{ 'name': 'x', 'content': '2', 'key': 'k', 'data-hid': 'k' }] })
    await pair.render()
    expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
    expect(pair.compiledDom.window.document.querySelectorAll('meta[name="x"]')).toHaveLength(1)
    expect(pair.compiledDom.window.document.querySelectorAll('link[rel="preload"]')).toHaveLength(1)
  })

  it('batches changes into one debounced render and honours dirty', async () => {
    const rendered = vi.fn()
    const { head } = await loaded(page, { hooks: { 'dom:rendered': rendered } })
    rendered.mockClear()
    head.push(toCompiledTags({ title: 'a' }))
    head.push(toCompiledTags({ title: 'b' }))
    expect(head.dirty).toBe(true)
    await settle()
    expect(rendered).toHaveBeenCalledTimes(1)
    expect(head.dirty).toBe(false)
    head.render()
    await settle()
    expect(rendered).toHaveBeenCalledTimes(1)
    head.dirty = true
    head.render()
    await settle()
    expect(rendered).toHaveBeenCalledTimes(2)
  })

  it('passes the renders context to dom:rendered and onRendered', async () => {
    const { head, dom } = await loaded(page)
    const onRendered = vi.fn()
    head.push(toCompiledTags({ meta: [{ name: 'x', content: 'y' }] }), { onRendered })
    await settle()
    const { renders } = onRendered.mock.calls[0]![0]
    const ctx = renders.find((r: any) => r.id === 'meta:x')
    expect(ctx.$el).toBe(dom.window.document.querySelector('meta[name="x"]'))
    expect(ctx.tag.props).toEqual({ name: 'x', content: 'y' })
    expect(renders.map((r: any) => r.id)).toContain('title')
  })

  it('writes nothing while dom:beforeRender pauses, then renders', async () => {
    let paused = false
    const { head, dom } = await loaded(page, { hooks: { 'dom:beforeRender': (ctx) => {
      ctx.shouldRender = !paused
    } } })
    paused = true
    head.push(toCompiledTags({ title: 'Paused' }))
    await settle()
    expect(dom.window.document.title).toBe('Home | Site')
    paused = false
    head.render()
    await settle()
    expect(dom.window.document.title).toBe('Paused | Site')
  })
})

describe('values', () => {
  const compiledTags = compile({ title: dynamicValue(0), meta: [{ name: 'description', content: dynamicValue(1) }], script: [{ key: 'data', type: 'text/plain', textContent: dynamicValue(0) }] }, 2)

  it.each([
    ['strings', ['Hi', 'desc']],
    ['numbers', [5, 1.5]],
  ])('renders %s on the compiled runtime', async (_, values) => {
    const pair = createPair([], 'none', undefined, input => input)
    pair.v3.push({ title: values[0], meta: [{ name: 'description', content: values[1] }], script: [{ key: 'data', type: 'text/plain', textContent: values[0] }] })
    pair.compiled.push(compiledTags, { values })
    await pair.render()
    expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
    expect(v3Runtime.heads.has(pair.compiled)).toBe(false)
  })

  it.each([
    ['empty string', ''],
    ['true text', 'true'],
    ['zero', 0],
    ['null', null],
    ['undefined', undefined],
    ['boolean', false],
    ['object', { a: 1 }],
    ['NaN', Number.NaN],
  ])('moves to v3 for %s, which decides it from rebuilt input', async (_, entryValue) => {
    const pair = createPair([], 'none', undefined, input => input)
    pair.v3.push({ title: entryValue as any, meta: [{ name: 'description', content: entryValue as any }], script: [{ key: 'data', type: 'text/plain', textContent: entryValue as any }] })
    pair.compiled.push(compiledTags, { values: [entryValue, entryValue] })
    await pair.render()
    expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
    expect(v3Runtime.heads.has(pair.compiled)).toBe(true)
  })

  it('a patch with new values updates attributes and text in place', async () => {
    const pair = createPair([], 'none', undefined, input => input)
    const v3 = pair.v3.push({ title: 'a', meta: [{ name: 'description', content: 'b' }], script: [{ key: 'data', type: 'text/plain', textContent: 'a' }] })
    const entry = pair.compiled.push(compiledTags, { values: ['a', 'b'] })
    await pair.render()
    const meta = pair.compiledDom.window.document.querySelector('meta[name="description"]')
    v3.patch({ title: 'c', meta: [{ name: 'description', content: 'd' }], script: [{ key: 'data', type: 'text/plain', textContent: 'c' }] })
    entry.patch(compiledTags, { values: ['c', 'd'] })
    await pair.render()
    expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
    expect(pair.compiledDom.window.document.querySelector('meta[name="description"]')).toBe(meta)
  })

  it('writes a value as text or an attribute, never as markup', async () => {
    const attack = '<img src=x onerror="alert(1)"></script><script>alert(2)</script>'
    const dom = ssrDom([], 'none')
    const head = createLazyHead({ document: dom.window.document })
    head.push(compiledTags, { values: [attack, attack] })
    head.render()
    await head.load()
    await settle()
    const document = dom.window.document
    expect(document.querySelectorAll('img')).toHaveLength(0)
    expect(document.querySelectorAll('script')).toHaveLength(1)
    expect(document.title).toBe(attack)
    expect(document.querySelector('meta[name="description"]')!.getAttribute('content')).toBe(attack)
    expect(document.querySelector('script')!.textContent).toBe(attack.replaceAll('</script', '<\\/script'))
  })

  it('keeps the v3 meaning of an explicit innerHTML slot', async () => {
    const markup = '<img src="x">'
    const pair = createPair([], 'none', undefined, input => input)
    pair.v3.push({ noscript: [{ key: 'n', innerHTML: markup }] })
    pair.compiled.push(compile({ noscript: [{ key: 'n', innerHTML: dynamicValue(0) }] }, 1), { values: [markup] })
    await pair.render()
    expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
  })
})

describe('template params', () => {
  const input = { title: 'Home', titleTemplate: '%s %separator %siteName', templateParams: { siteName: 'Site', separator: '-' }, meta: [{ name: 'description', content: 'Welcome to %siteName' }] }

  it.each(['plugin', 'lazy'] as const)('renders natively with the %s', async (params) => {
    const pair = createPair([{ input }], params)
    pair.push(input)
    await pair.render()
    expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
    expect(pair.compiledDom.window.document.title).toBe('Home - Site')
    expect(v3Runtime.heads.has(pair.compiled)).toBe(false)
  })

  it('loads the lazy plugin only once a value holds %', async () => {
    const dom = ssrDom([], 'none')
    const head = createLazyHead({ document: dom.window.document, plugins: [lazyTemplateParams] })
    head.push(toCompiledTags({ title: 'Plain', meta: [{ name: 'a', content: 'b' }] }))
    head.render()
    await head.load()
    await settle()
    expect(head.plugins.get('template-params')).toBe(lazyTemplateParams)
    head.push(toCompiledTags({ templateParams: { x: 'y' }, meta: [{ name: 'a', content: '%x' }] }))
    await settle()
    expect(head.plugins.get('template-params')!.hooks).toBeDefined()
    expect(dom.window.document.querySelector('meta[name="a"]')!.getAttribute('content')).toBe('y')
  })

  it('applies params to a value', async () => {
    const pair = createPair([], 'lazy', undefined, i => i)
    pair.v3.push({ templateParams: { siteName: 'S' }, meta: [{ name: 'description', content: 'a %siteName' }] })
    pair.compiled.push(compile({ templateParams: { siteName: 'S' }, meta: [{ name: 'description', content: dynamicValue(0) }] }, 1), { values: ['a %siteName'] })
    await pair.render()
    expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
  })
})

describe('handoff to the v3 runtime', () => {
  const second = { title: 'Second', meta: [{ name: 'description', content: 'two' }, { property: 'og:image', content: '/3.png' }], htmlAttrs: { class: 'c' } }

  async function hydrated() {
    const pair = createPair([{ input: page }], 'none')
    const entry = pair.push(page)
    return { pair, entry }
  }

  it('before the first render, when a loose push arrives during hydration', async () => {
    const { pair } = await hydrated()
    pair.v3.push({ meta: [{ name: 'loose', content: 'yes' }] })
    pair.compiled.push({ meta: [{ name: 'loose', content: 'yes' }] })
    await pair.render()
    expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
  })

  it('before load, when a change and a loose push wait on a load block', async () => {
    const { pair, entry } = await hydrated()
    pair.v3.render()
    pair.compiled.render()
    pair.compiled.blockLoad()
    entry.patch(second)
    pair.v3.push({ link: [{ rel: 'prev', href: '/p' }] })
    pair.compiled.push({ link: [{ rel: 'prev', href: '/p' }] })
    await pair.render()
    expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
  })

  it.each([
    ['a loose push', (pair: any) => {
      pair.v3.push({ meta: [{ name: 'loose', content: 'yes' }], htmlAttrs: { class: 'loose' } })
      pair.compiled.push({ meta: [{ name: 'loose', content: 'yes' }], htmlAttrs: { class: 'loose' } })
    }],
    ['a loose patch', (_: any, entry: any, v3: any) => {
      v3.patch({ title: 'Loose' })
      entry.patch({ title: 'Loose' })
    }],
    ['a hook listener', (pair: any) => {
      for (const head of [pair.v3, pair.compiled]) {
        head.hooks.hook('tags:resolve', ({ tags }: any) => {
          for (const tag of tags) {
            if (tag.tag === 'title')
              tag.textContent = 'Hooked'
          }
        })
        head.dirty = true
      }
    }],
    ['a plugin with hooks', (pair: any) => {
      for (const head of [pair.v3, pair.compiled]) {
        head.use({ key: 'meta', hooks: { 'tags:afterResolve': ({ tags }: any) => {
          tags.push({ tag: 'meta', props: { name: 'from-plugin', content: 'yes' }, _w: 100, _p: 0, _d: 'meta:from-plugin' })
        } } })
        head.dirty = true
      }
    }],
  ])('after the first render, on %s', async (_, change) => {
    const pair = createPair([{ input: page }, { input: second }], 'none')
    const entry = pair.compiled.push(toCompiledTags(page))
    const v3 = pair.v3.push(page)
    const other = pair.push(second)
    await pair.render()
    expect(v3Runtime.heads.has(pair.compiled)).toBe(false)
    change(pair, entry, v3)
    await pair.render()
    expect(v3Runtime.heads.has(pair.compiled)).toBe(true)
    expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
    // the v3 runtime now owns every element the compiled runtime rendered
    other.dispose()
    entry.dispose()
    v3.dispose()
    await pair.render()
    expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
    pair.push(second)
    await pair.render()
    expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
  })

  it('with values live, after a dispose, with arrayable tags', async () => {
    const compiledTags = compile({ title: dynamicValue(0), meta: [{ property: 'og:image', content: '/a.png' }, { property: 'og:image', content: dynamicValue(1) }, { name: 'description', content: dynamicValue(0) }] }, 2)
    const loose = (a: string, b: string) => ({ title: a, meta: [{ property: 'og:image', content: '/a.png' }, { property: 'og:image', content: b }, { name: 'description', content: a }] })
    const later = { title: 'Second', meta: [{ name: 'description', content: 'two' }], htmlAttrs: { class: 'c' } }
    const pair = createPair([{ input: loose('t', '/b.png') }, { input: later }], 'none', undefined, i => i)
    const v3 = pair.v3.push(loose('t', '/b.png'))
    const entry = pair.compiled.push(compiledTags, { values: ['t', '/b.png'] })
    const other = pair.push(toCompiledTags(later))
    await pair.render()
    other.dispose()
    pair.v3.push(later)
    pair.compiled.push(later)
    v3.patch(loose('u', '/c.png'))
    entry.patch(compiledTags, { values: ['u', '/c.png'] })
    await pair.render()
    expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
    v3.patch(loose('w', '/d.png'))
    entry.patch(compiledTags, { values: ['w', '/d.png'] })
    await pair.render()
    expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
    expect(pair.compiledDom.window.document.querySelectorAll('meta[property="og:image"]')).toHaveLength(2)
  })

  it('retries a failed v3 load on the next change and writes nothing meanwhile', async () => {
    const onLoadError = vi.fn()
    const { dom, head } = await loaded(page, { onLoadError })
    v3Runtime.fail = 1
    head.push({ title: 'Loose' })
    await settle()
    expect(onLoadError).toHaveBeenCalledTimes(1)
    expect(dom.window.document.title).toBe('Home | Site')
    head.push(toCompiledTags({ meta: [{ name: 'later', content: 'yes' }] }))
    await settle()
    expect(dom.window.document.title).toBe('Loose | Site')
    expect(dom.window.document.querySelector('meta[name="later"]')).not.toBeNull()
  })
})

describe('server entries changed before hydration ends', () => {
  const stylesheet: ResolvableHead = { link: [{ rel: 'stylesheet', href: '/server.css' }] }
  const hrefs = (dom: ReturnType<typeof ssrDom>, rel: string) => [...dom.window.document.querySelectorAll(`link[rel="${rel}"]`)].map(link => link.getAttribute('href'))

  it.each([false, true])('removes a server stylesheet whose compiled tags were disposed (render: %s)', async (render) => {
    const dom = ssrDom([{ input: stylesheet }], 'none')
    const head = createLazyHead({ document: dom.window.document })
    head.push(toCompiledTags(stylesheet)).dispose()
    if (render)
      head.render()
    expect(await head.load()).toBe(true)
    await settle(head)
    expect(hrefs(dom, 'stylesheet')).toEqual([])
    expect(v3Runtime.heads.has(head)).toBe(false)
  })

  it.each([false, true])('removes an obsolete link patched repeatedly (render: %s)', async (render) => {
    const link = (href: string) => toCompiledTags({ link: [{ rel: 'prev', href }] })
    const dom = ssrDom([{ input: { link: [{ rel: 'prev', href: '/server' }] } }], 'none')
    const head = createLazyHead({ document: dom.window.document })
    const entry = head.push(link('/server'))
    entry.patch(link('/intermediate'))
    entry.patch(link('/client'))
    if (render)
      head.render()
    expect(await head.load()).toBe(true)
    await settle(head)
    expect(hrefs(dom, 'prev')).toEqual(['/client'])
    expect(v3Runtime.heads.has(head)).toBe(false)
  })

  it.each([false, true])('adopts with the values the server rendered after a patch with new values (render: %s)', async (render) => {
    const compiledTags = compile({ meta: [{ name: 'description', content: dynamicValue(0) }] }, 1)
    const dom = ssrDom([{ input: { meta: [{ name: 'description', content: 'server' }] } }], 'none')
    const head = createLazyHead({ document: dom.window.document })
    const entry = head.push(compiledTags, { values: ['server'] })
    // an empty value hands the head to v3, which drops a meta with no content
    entry.patch(compiledTags, { values: [''] })
    if (render)
      head.render()
    expect(await head.load()).toBe(true)
    await settle(head)
    expect(dom.window.document.querySelector('meta[name="description"]')).toBeNull()
    expect(v3Runtime.heads.has(head)).toBe(true)
  })

  it.each([
    ['compiled tags', toCompiledTags(stylesheet), false],
    ['loose input', stylesheet, true],
  ])('adopts %s disposed while lazy plugins load', async (_, input, v3) => {
    const dom = ssrDom([{ input: stylesheet }], 'none')
    const started = Promise.withResolvers<void>()
    const plugins = Promise.withResolvers<[]>()
    const head = createLazyHead({
      document: dom.window.document,
      lazyPlugins: () => {
        started.resolve()
        return plugins.promise
      },
    })
    const loading = head.load()
    await started.promise
    head.push(input).dispose()
    plugins.resolve([])
    expect(await loading).toBe(true)
    await settle(head)
    expect(hrefs(dom, 'stylesheet')).toEqual([])
    expect(v3Runtime.heads.has(head)).toBe(v3)
  })
})

describe('nuxt installClientHead', () => {
  // A replay of nuxt/src/head/runtime/install-client-head.ts and the route announcer
  it('keeps the compiled runtime through a navigation with a delayed dispose', async () => {
    const appHead = { htmlAttrs: { lang: 'en' }, titleTemplate: '%s %separator %siteName', templateParams: { siteName: 'Nuxt' } }
    const home = { title: 'Home', meta: [{ name: 'description', content: 'home' }] }
    const about = { title: 'About', meta: [{ name: 'description', content: 'about' }], link: [{ rel: 'canonical', href: '/about' }] }
    const pair = createPair([{ input: appHead }, { input: home }], 'plugin')
    const nuxtApp = { transitionPromise: undefined as Promise<void> | undefined }
    const install = (head: any, app: unknown) => {
      head.push(app)
      let pause = true
      head.hooks.hook('dom:beforeRender', (ctx: any) => {
        ctx.shouldRender = !pause
      })
      const announcer = vi.fn()
      head.hooks.hook('dom:rendered', announcer)
      const originalPush = head.push.bind(head)
      head.push = (input: any, options: any) => {
        const entry = originalPush(input, options)
        const originalDispose = entry.dispose.bind(entry)
        entry.dispose = () => {
          if (nuxtApp.transitionPromise)
            nuxtApp.transitionPromise.finally(originalDispose)
          else
            originalDispose()
        }
        return entry
      }
      return {
        announcer,
        sync() {
          pause = false
          head.render()
        },
        pause() {
          pause = true
        },
      }
    }
    const v3Nuxt = install(pair.v3, appHead)
    const nuxt = install(pair.compiled, toCompiledTags(appHead))
    const homeV3 = pair.v3.push(home)
    const homeTags = pair.compiled.push(toCompiledTags(home))
    // app:suspense:resolve
    v3Nuxt.sync()
    nuxt.sync()
    await pair.compiled.load()
    await settle()
    expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
    expect(nuxt.announcer).toHaveBeenCalled()

    // router.beforeEach, page:start, the new page, a transition-delayed dispose, page:finish
    pair.compiled.blockLoad()
    nuxt.pause()
    v3Nuxt.pause()
    let finish!: () => void
    nuxtApp.transitionPromise = new Promise<void>((resolve) => {
      finish = resolve
    })
    pair.v3.push(about)
    pair.compiled.push(toCompiledTags(about))
    homeV3.dispose()
    homeTags.dispose()
    await settle()
    expect(pair.compiledDom.window.document.title).toBe('Home | Nuxt')
    finish()
    await nuxtApp.transitionPromise
    nuxtApp.transitionPromise = undefined
    v3Nuxt.sync()
    nuxt.sync()
    await settle()
    expect(pair.compiledDom.serialize()).toBe(pair.v3Dom.serialize())
    expect(pair.compiledDom.window.document.title).toBe('About | Nuxt')
    expect(v3Runtime.heads.has(pair.compiled)).toBe(false)
  })
})

it('registers the template params plugin from lazyPlugins natively', async () => {
  const input = { title: 'a', titleTemplate: '%s %separator b' }
  const pair = createPair([{ input }], 'plugin')
  const dom = ssrDom([{ input }], 'plugin')
  const head = createLazyHead({ document: dom.window.document, lazyPlugins: async () => [TemplateParamsPlugin] })
  head.push(toCompiledTags(input))
  pair.push(input)
  head.render()
  await head.load()
  await pair.render()
  await settle(head)
  expect(dom.serialize()).toBe(pair.v3Dom.serialize())
  expect(v3Runtime.heads.has(head)).toBe(false)
})
