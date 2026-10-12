import { JSDOM } from 'jsdom'
import { renderDOMHead } from 'unhead/client'
import { createStreamableHead } from 'unhead/stream/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { init as initIife } from '../../src/stream/iife'

let originalWindow: any
let originalDocument: any

beforeEach(() => {
  originalWindow = globalThis.window
  originalDocument = globalThis.document
})

afterEach(() => {
  globalThis.window = originalWindow
  globalThis.document = originalDocument
})

function setupStreamingDom(queuedEntries: any[] = [], streamKey = '__unhead__') {
  const dom = new JSDOM(`<!DOCTYPE html>
<html>
<head>
<title>Initial</title>
<script>window.${streamKey}={_q:[],push(e){this._q.push(e)}}</script>
</head>
<body></body>
</html>`)

  const win = dom.window as any
  // Simulate queued entries from SSR streaming (before iife runs)
  win[streamKey] = {
    _q: queuedEntries.map(e => [e]), // iife expects each item to be an array of entries
    push: (e: any) => win[streamKey]._q.push(e),
  }

  // Set globals for iife and createStreamableHead
  globalThis.window = win
  globalThis.document = win.document

  // Simulate iife running - this creates _head and processes queue
  initIife({ streamKey })

  return { dom, window: win, document: win.document }
}

function waitForDomUpdate() {
  return new Promise(resolve => setTimeout(resolve, 50))
}

describe('streaming client hydration', () => {
  describe('queue consumption', () => {
    it('processes queued entries on creation', async () => {
      const { document } = setupStreamingDom([
        { title: 'Streamed Title' },
        { meta: [{ name: 'description', content: 'Streamed description' }] },
      ])

      createStreamableHead()
      await waitForDomUpdate()

      expect(document.title).toBe('Streamed Title')
      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Streamed description')
    })

    it('replaces queue push with direct head push', async () => {
      const { window, document } = setupStreamingDom([
        { title: 'Initial Streamed' },
      ])

      createStreamableHead()
      await waitForDomUpdate()

      // Simulate late-arriving streamed entry (push expects array of entries)
      window.__unhead__.push([{ title: 'Late Streamed' }])
      await waitForDomUpdate()

      expect(document.title).toBe('Late Streamed')
    })

    it('handles empty queue', async () => {
      const { document } = setupStreamingDom([])

      const head = createStreamableHead()
      expect(head).toBeDefined()
      await waitForDomUpdate()

      head!.push({ title: 'After Hydration' })
      await waitForDomUpdate()

      expect(document.title).toBe('After Hydration')
    })

    it('uses custom streamKey', async () => {
      const { document } = setupStreamingDom(
        [{ title: 'Custom Key Title' }],
        '__custom__',
      )

      createStreamableHead({ streamKey: '__custom__' })
      await waitForDomUpdate()

      expect(document.title).toBe('Custom Key Title')
    })
  })

  describe('multiple entries', () => {
    it('processes multiple queued entries in order', async () => {
      const { document } = setupStreamingDom([
        { title: 'First' },
        { title: 'Second' },
        { title: 'Third' },
      ])

      createStreamableHead()
      await waitForDomUpdate()

      // Last one wins
      expect(document.title).toBe('Third')
    })

    it('merges meta tags from multiple entries', async () => {
      const { document } = setupStreamingDom([
        { meta: [{ name: 'author', content: 'John' }] },
        { meta: [{ name: 'keywords', content: 'test' }] },
      ])

      createStreamableHead()
      await waitForDomUpdate()

      expect(document.querySelector('meta[name="author"]')?.getAttribute('content')).toBe('John')
      expect(document.querySelector('meta[name="keywords"]')?.getAttribute('content')).toBe('test')
    })
  })

  describe('htmlAttrs and bodyAttrs', () => {
    it('applies htmlAttrs from queue', async () => {
      const { document } = setupStreamingDom([
        { htmlAttrs: { lang: 'fr', dir: 'rtl' } },
      ])

      createStreamableHead()
      await waitForDomUpdate()

      expect(document.documentElement.getAttribute('lang')).toBe('fr')
      expect(document.documentElement.getAttribute('dir')).toBe('rtl')
    })

    it('applies bodyAttrs from queue', async () => {
      const { document } = setupStreamingDom([
        { bodyAttrs: { class: 'dark-mode' } },
      ])

      createStreamableHead()
      await waitForDomUpdate()

      expect(document.body.getAttribute('class')).toBe('dark-mode')
    })
  })

  describe('script and link tags', () => {
    it('adds script tags from queue', async () => {
      const { document } = setupStreamingDom([
        { script: [{ src: 'https://example.com/app.js' }] },
      ])

      createStreamableHead()
      await waitForDomUpdate()

      expect(document.querySelector('script[src="https://example.com/app.js"]')).toBeTruthy()
    })

    it('adds link tags from queue', async () => {
      const { document } = setupStreamingDom([
        { link: [{ rel: 'stylesheet', href: 'https://example.com/styles.css' }] },
      ])

      createStreamableHead()
      await waitForDomUpdate()

      expect(document.querySelector('link[href="https://example.com/styles.css"]')).toBeTruthy()
    })
  })

  describe('no queue present', () => {
    it('returns undefined when iife has not run', async () => {
      const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body></body></html>`)
      const win = dom.window as any

      // Temporarily set globals
      const savedWindow = globalThis.window
      globalThis.window = win

      const head = createStreamableHead()
      expect(head).toBeUndefined()

      globalThis.window = savedWindow
    })

    it('works with empty queue after iife runs', async () => {
      const { document } = setupStreamingDom([])

      const head = createStreamableHead()
      expect(head).toBeDefined()
      await waitForDomUpdate()
      head!.push({ title: 'After Iife' })
      await waitForDomUpdate()

      expect(document.title).toBe('After Iife')
    })
  })

  describe('deduplication after hydration', () => {
    it('deduplicates meta tags after queue consumption', async () => {
      const { document } = setupStreamingDom([
        { meta: [{ name: 'description', content: 'From stream' }] },
      ])

      const head = createStreamableHead()
      expect(head).toBeDefined()
      await waitForDomUpdate()

      head!.push({ meta: [{ name: 'description', content: 'Updated' }] })
      await waitForDomUpdate()

      const descriptions = document.querySelectorAll('meta[name="description"]')
      expect(descriptions.length).toBe(1)
      expect(descriptions[0].getAttribute('content')).toBe('Updated')
    })
  })

  describe('queue handoff', () => {
    it('drops replayed batches instead of retaining them', async () => {
      const { window, document } = setupStreamingDom([
        { title: 'Queued' },
        { meta: [{ name: 'description', content: 'Queued' }] },
      ])
      await waitForDomUpdate()

      expect(document.title).toBe('Queued')
      expect(window.__unhead__._q).toEqual([])
    })

    it('does not accumulate batches pushed after init', async () => {
      const { window } = setupStreamingDom([])
      createStreamableHead()
      window.__unhead__.push([{ title: 'Live' }])
      await waitForDomUpdate()

      expect(window.__unhead__._q).toEqual([])
    })
  })

  describe('same-tick pushes', () => {
    it('keeps a client push made in the tick the iife initialised', async () => {
      const { document } = setupStreamingDom([])
      const head = createStreamableHead()!

      const active = head.push({ title: 'Client title', meta: [{ name: 'description', content: 'Client' }] })
      await waitForDomUpdate()

      expect(active._i).toBeGreaterThan(0)
      expect(document.title).toBe('Client title')
      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Client')
    })

    it('keeps a streamed chunk that arrives in the tick the iife initialised', async () => {
      const { window, document } = setupStreamingDom([])
      createStreamableHead()

      window.__unhead__.push([{ title: 'Streamed title' }])
      await waitForDomUpdate()

      expect(document.title).toBe('Streamed title')
    })

    it('keeps a patch applied in the tick the iife initialised', async () => {
      const { document } = setupStreamingDom([])
      const head = createStreamableHead()!

      const active = head.push({ title: 'First' })
      active.patch({ title: 'Patched' })
      await waitForDomUpdate()

      expect(document.title).toBe('Patched')
    })
  })

  describe('chunk batching', () => {
    it('renders once for the whole pre-init backlog', async () => {
      // One backlog render produces one title write.
      const dom = new JSDOM('<!DOCTYPE html><html><head><title>Initial</title></head><body></body></html>')
      const win = dom.window as any
      win.__unhead__ = {
        _q: [[{ title: 'A' }], [{ title: 'B' }], [{ title: 'C' }]],
        push: (entries: any) => win.__unhead__._q.push(entries),
      }
      globalThis.window = win
      globalThis.document = win.document

      const proto = win.Document.prototype
      const original = Object.getOwnPropertyDescriptor(proto, 'title')!
      const written: string[] = []
      Object.defineProperty(proto, 'title', {
        configurable: true,
        get() { return original.get!.call(this) },
        set(value: string) {
          written.push(value)
          original.set!.call(this, value)
        },
      })

      try {
        initIife({})
      }
      finally {
        Object.defineProperty(proto, 'title', original)
      }

      expect(written).toEqual(['C'])
      expect(win.document.title).toBe('C')
    })

    it('renders once per streamed chunk, not once per entry', async () => {
      const { window, document } = setupStreamingDom([])
      const head = createStreamableHead()!
      await waitForDomUpdate()

      let renders = 0
      const render = head.render
      head.render = () => {
        renders++
        return render()
      }

      window.__unhead__.push([
        { title: 'Streamed' },
        { meta: [{ name: 'description', content: 'Streamed description' }] },
        { link: [{ rel: 'canonical', href: 'https://example.com/' }] },
        { script: [{ type: 'application/ld+json', innerHTML: '{"@type":"Organization"}' }] },
      ])
      await waitForDomUpdate()

      expect(renders).toBe(1)
      expect(document.title).toBe('Streamed')
      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Streamed description')
      expect(document.querySelector('link[rel="canonical"]')).toBeTruthy()
      expect(document.querySelector('script[type="application/ld+json"]')).toBeTruthy()
    })

    it('keeps one render when a listener pushes another chunk mid-batch', async () => {
      const { window, document } = setupStreamingDom([])
      let reentered = false
      const head = createStreamableHead({
        hooks: {
          'entries:updated': () => {
            if (reentered)
              return
            reentered = true
            window.__unhead__.push([{ meta: [{ name: 'author', content: 'Nested' }] }])
          },
        },
      })!
      await waitForDomUpdate()

      let renders = 0
      const render = head.render
      head.render = () => {
        renders++
        return render()
      }

      window.__unhead__.push([{ title: 'Outer' }, { meta: [{ name: 'description', content: 'Outer' }] }])
      await waitForDomUpdate()

      expect(renders).toBe(1)
      expect(document.title).toBe('Outer')
      expect(document.querySelector('meta[name="author"]')?.getAttribute('content')).toBe('Nested')
      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Outer')
    })

    it('leaves the render-per-push behaviour intact for client pushes', async () => {
      const { window } = setupStreamingDom([])
      const head = createStreamableHead()!
      await waitForDomUpdate()

      let renders = 0
      const render = head.render
      head.render = () => {
        renders++
        return render()
      }

      head.push({ title: 'One' })
      head.push({ meta: [{ name: 'description', content: 'Two' }] })
      await waitForDomUpdate()

      expect(renders).toBe(2)
      expect(window.document.title).toBe('One')
    })
  })

  describe('client adapter hooks', () => {
    it('exposes hooks to the renderer owned by the streaming core', async () => {
      const { document } = setupStreamingDom([])
      let calls = 0
      const head = createStreamableHead({
        hooks: {
          'tags:resolve': ({ tags }) => {
            calls++
            const title = tags.find(tag => tag.tag === 'title')
            if (title)
              title.textContent = 'Hooked stream title'
          },
        },
      })

      await waitForDomUpdate()
      head!.push({ title: 'Original stream title' })
      await waitForDomUpdate()

      expect(calls).toBeGreaterThan(0)
      expect(document.title).toBe('Hooked stream title')
    })
  })

  describe('streamed entry release', () => {
    it.each([undefined, 'merge'] as const)('keeps streamed props merged into a keyed client script with strategy %s', async (strategy) => {
      const { document } = setupStreamingDom([{ script: [{ key: 'analytics', src: '/analytics.js', defer: true }] }])
      const head = createStreamableHead<any>()!
      const active = head.push({ script: [{ 'key': 'analytics', 'data-client': 'ready', 'tagDuplicateStrategy': strategy }] })
      await waitForDomUpdate()

      expect(document.querySelector('script[src="/analytics.js"]')?.hasAttribute('defer')).toBe(true)
      active.dispose()
      await waitForDomUpdate()
      expect(document.querySelector('script[src="/analytics.js"]')?.hasAttribute('defer')).toBe(true)
    })

    it.each(['tags:beforeResolve', 'tags:resolve', 'tags:afterResolve'] as const)('keeps streamed tags when %s excludes the client owner', async (hook) => {
      const { document } = setupStreamingDom([{ htmlAttrs: { lang: 'en' } }])
      const head = createStreamableHead()!
      let clientId = -1
      head.hooks.hook(hook, (ctx) => {
        ctx.tags = ctx.tags.filter(tag => (tag._p! >> 10) !== clientId)
      })
      head._b = true
      const active = head.push({ htmlAttrs: { lang: 'en' } })
      clientId = active._i
      head._b = false
      head.render()
      active.dispose()
      await waitForDomUpdate()
      expect(document.documentElement.lang).toBe('en')
    })

    it.each((['tags:beforeResolve', 'tags:resolve', 'tags:afterResolve'] as const).flatMap(hook => (['lang', 'class', 'style'] as const).map(prop => [hook, prop] as const)))('keeps streamed %s attribute props when the client loses %s', async (hook, prop) => {
      const { document } = setupStreamingDom([{ htmlAttrs: { lang: 'en', class: 'server', style: 'color: red' } }])
      const head = createStreamableHead()!
      let clientId = -1
      head.hooks.hook(hook, ({ tags }) => {
        for (const tag of tags) {
          if ((tag._p! >> 10) !== clientId)
            continue
          if (prop === 'lang')
            delete tag.props.lang
          else if (prop === 'class')
            (tag.props.class as unknown as Set<string>).delete('server')
          else
            (tag.props.style as unknown as Map<string, string>).delete('color')
        }
      })
      head._b = true
      const active = head.push({ htmlAttrs: { lang: 'en', class: 'server hydrated', style: 'color: red; padding: 1px' } })
      clientId = active._i
      head._b = false
      head.render()
      active.dispose()
      await waitForDomUpdate()
      expect(document.documentElement.lang).toBe('en')
      expect(document.documentElement.classList.contains('server')).toBe(true)
      expect(document.documentElement.style.color).toBe('red')
    })

    it.each(['tags:beforeResolve', 'tags:resolve', 'tags:afterResolve'] as const)('keeps a late streamed title when %s excludes its hidden client owner', async (hook) => {
      const { window, document } = setupStreamingDom([])
      const head = createStreamableHead()!
      let clientId = -1
      head.hooks.hook(hook, (ctx) => {
        ctx.tags = ctx.tags.filter(tag => (tag._p! >> 10) !== clientId)
      })
      head._b = true
      const active = head.push({ title: 'Client title' })
      clientId = active._i
      head._b = false
      head.render()
      window.__unhead__.push([{ title: 'Late server title' }])
      await waitForDomUpdate()
      expect(document.title).toBe('Late server title')
      active.dispose()
      await waitForDomUpdate()
      expect(document.title).toBe('Late server title')
    })

    it.each(['tags:beforeResolve', 'tags:resolve', 'tags:afterResolve'] as const)('releases streamed tags with a client winner through %s', async (hook) => {
      const { document } = setupStreamingDom([{ title: 'Hydrated', htmlAttrs: { lang: 'en' } }])
      const head = createStreamableHead()!
      head.hooks.hook(hook, () => {})
      const active = head.push({ title: 'Hydrated', htmlAttrs: { lang: 'en' } })
      await waitForDomUpdate()
      expect(document.title).toBe('Hydrated')
      expect(document.documentElement.lang).toBe('en')
      active.dispose()
      await waitForDomUpdate()
      expect(document.title).not.toBe('Hydrated')
      expect(document.documentElement.hasAttribute('lang')).toBe(false)
    })

    it('releases a keyed script whose props separate client entries fully cover', async () => {
      const { document } = setupStreamingDom([{ script: [{ key: 'analytics', src: '/analytics.js', defer: true, class: 'server ready', style: 'color: red; padding: 1px' }] }])
      const head = createStreamableHead<any>()!
      const first = head.push({ script: [{ key: 'analytics', src: '/analytics.js', class: 'server', style: 'color: red' }] })
      const second = head.push({ script: [{ key: 'analytics', defer: true, class: 'ready', style: 'padding: 1px' }] })
      await waitForDomUpdate()
      const script = document.querySelector('script[src="/analytics.js"]')!
      expect(script.hasAttribute('defer')).toBe(true)
      expect(script.classList.contains('server')).toBe(true)
      expect(script.classList.contains('ready')).toBe(true)
      expect((script as HTMLElement).style.padding).toBe('1px')
      first.dispose()
      second.dispose()
      await waitForDomUpdate()
      expect(document.querySelector('script[src="/analytics.js"]')).toBeNull()
    })

    it('honors explicit replacement of a keyed streamed script', async () => {
      const { document } = setupStreamingDom([{ script: [{ key: 'analytics', src: '/analytics.js', defer: true }] }])
      const head = createStreamableHead<any>()!
      const active = head.push({ script: [{ 'key': 'analytics', 'data-client': 'ready', 'tagDuplicateStrategy': 'replace' }] })
      await waitForDomUpdate()
      expect(document.querySelector('script[data-client="ready"]')?.hasAttribute('src')).toBe(false)
      active.dispose()
      await waitForDomUpdate()
      expect(document.querySelector('script[data-hid="analytics"]')).toBeNull()
    })

    it('preserves a higher-priority streamed tag against a client fallback', async () => {
      const { document } = setupStreamingDom([
        { meta: [{ name: 'description', content: 'Server page description' }] },
      ])
      let hold = true
      const head = createStreamableHead({
        hooks: {
          'dom:beforeRender': (ctx) => {
            if (hold)
              ctx.shouldRender = false
          },
        },
      })!
      const fallback = head.push({ meta: [{ name: 'description', content: 'Client site fallback' }] })
      hold = false
      renderDOMHead(head, { tagWeight: tag => tag.props.content === 'Client site fallback' ? 200 : 100 })

      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Server page description')

      fallback.dispose()
      await waitForDomUpdate()

      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Server page description')
    })

    it.each([50, 100])('releases a streamed tag covered by a client with weight %i before a weaker fallback', async (weight) => {
      const { document } = setupStreamingDom([
        { meta: [{ name: 'description', content: 'Server page description' }] },
      ])
      let hold = true
      const head = createStreamableHead({
        hooks: {
          'dom:beforeRender': (ctx) => {
            if (hold)
              ctx.shouldRender = false
          },
        },
      })!
      const owner = head.push({ meta: [{ name: 'description', content: 'Client page description' }] })
      const fallback = head.push({ meta: [{ name: 'description', content: 'Client site fallback' }] })
      hold = false
      renderDOMHead(head, {
        tagWeight: tag => tag.props.content === 'Client page description' ? weight : tag.props.content === 'Client site fallback' ? 200 : 100,
      })

      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Client page description')

      owner.dispose()
      fallback.dispose()
      await waitForDomUpdate()

      expect(document.querySelector('meta[name="description"]')).toBeNull()
    })

    it('keeps streamed tags when a cached client entry is excluded', async () => {
      const { window, document } = setupStreamingDom([])
      let excludeClient = false
      const head = createStreamableHead()!
      head.hooks.hook('entries:resolve', (ctx) => {
        if (excludeClient)
          ctx.entries = ctx.entries.filter(entry => (entry as any)._streamed)
      })
      const active = head.push({ title: 'Client title' })
      excludeClient = true
      window.__unhead__.push([{ title: 'Streamed title' }])
      head.dirty = true
      head.render()
      active.dispose()
      await waitForDomUpdate()

      expect(document.title).toBe('Streamed title')
    })

    it('releases late streamed tags already covered by a client entry', async () => {
      const { window, document } = setupStreamingDom([])
      const head = createStreamableHead()!
      const active = head.push({ meta: [{ name: 'description', content: 'Client description' }] })
      window.__unhead__.push([{ meta: [{ name: 'description', content: 'Late description' }] }])
      active.dispose()
      await waitForDomUpdate()

      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBeUndefined()
    })

    it('releases streamed attributes after rendering with custom weights', async () => {
      const { document } = setupStreamingDom([{ htmlAttrs: { lang: 'en' } }])
      const head = createStreamableHead()!
      head._b = true
      const a = head.push({ htmlAttrs: { 'lang': 'fr', 'data-page': 'home' } })
      const b = head.push({ htmlAttrs: { lang: 'fr' } })
      a.patch({ htmlAttrs: { 'lang': 'en', 'data-page': 'home' } })
      head._b = false
      renderDOMHead(head, { tagWeight: tag => tag.props.lang === 'en' ? 200 : 100 })
      expect(document.documentElement.lang).toBe('en')

      a.dispose()
      b.dispose()
      await waitForDomUpdate()

      expect(document.documentElement.hasAttribute('lang')).toBe(false)
    })

    it.each(['merge', 'replace'] as const)('honors explicit %s ownership with matching keys and differently weighted attributes', async (strategy) => {
      const { document } = setupStreamingDom([{ htmlAttrs: { lang: 'en' } }])
      const head = createStreamableHead()!
      head._b = true
      const a = head.push({ htmlAttrs: { lang: 'fr', key: 'page' } })
      const b = head.push({ htmlAttrs: { lang: 'en', key: 'page' } }, { tagDuplicateStrategy: strategy })
      head._b = false
      renderDOMHead(head, { tagWeight: tag => tag.props.lang === 'en' ? 200 : 100 })

      b.dispose()
      a.dispose()
      await waitForDomUpdate()

      // Merge combines later props, while replace keeps the lower weight.
      expect(document.documentElement.getAttribute('lang')).toBe(strategy === 'merge' ? null : 'en')
    })

    it.each([
      ['attributes', { 'lang': 'en', 'data-theme': 'dark' }, { lang: 'en' }, { 'data-theme': 'dark' }, 'lang'],
      ['classes', { class: 'page dark' }, { class: 'page' }, { class: 'dark' }, 'class'],
      ['styles', { style: 'color: red; background-color: black' }, { style: 'color: red' }, { style: 'background-color: black' }, 'style'],
    ] as const)('releases streamed %s covered by separate client entries', async (_, streamed, first, second, attribute) => {
      const { document } = setupStreamingDom([{ htmlAttrs: streamed }])
      const head = createStreamableHead()!
      const a = head.push({ htmlAttrs: first })
      const b = head.push({ htmlAttrs: second })
      await waitForDomUpdate()

      a.dispose()
      b.dispose()
      await waitForDomUpdate()

      expect(document.documentElement.getAttribute(attribute) ?? '').toBe('')
    })

    it('keeps streamed attributes when the effective client value differs', async () => {
      const { document } = setupStreamingDom([{ htmlAttrs: { 'lang': 'en', 'data-theme': 'dark' } }])
      const head = createStreamableHead()!
      const a = head.push({ htmlAttrs: { lang: 'en' } })
      const b = head.push({ htmlAttrs: { 'lang': 'fr', 'data-theme': 'dark' } })
      await waitForDomUpdate()
      expect(document.documentElement.lang).toBe('fr')

      a.dispose()
      b.dispose()
      await waitForDomUpdate()

      expect(document.documentElement.lang).toBe('en')
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })

    it('releases a streamed entry a hydrating entry covers', async () => {
      const { document } = setupStreamingDom([
        { title: 'Async page', meta: [{ name: 'description', content: 'Async description' }] },
      ])

      const head = createStreamableHead()!
      await waitForDomUpdate()

      const active = head.push({
        title: 'Async page',
        meta: [{ name: 'description', content: 'Async description' }],
      })
      await waitForDomUpdate()

      expect([...head.entries.values()].filter((e: any) => e._streamed)).toEqual([])

      // Unmounting the component removes its tags.
      active.dispose()
      await waitForDomUpdate()

      expect(document.title).not.toBe('Async page')
      expect(document.querySelector('meta[name="description"]')).toBeNull()
    })

    it('keeps a streamed entry a client entry only partly covers', async () => {
      const { document } = setupStreamingDom([
        { title: 'Async page', meta: [{ name: 'description', content: 'Async description' }] },
      ])

      const head = createStreamableHead()!
      await waitForDomUpdate()

      head.push({ title: 'Async page' })
      await waitForDomUpdate()

      expect([...head.entries.values()].filter((e: any) => e._streamed)).toHaveLength(1)
      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Async description')
    })

    it('releases a streamed entry that arrives before its covering entry', async () => {
      const { window, document } = setupStreamingDom([])

      const head = createStreamableHead()!
      window.__unhead__.push([{ title: 'Async page', meta: [{ name: 'description', content: 'Async description' }] }])
      await waitForDomUpdate()

      const active = head.push({
        title: 'Async page',
        meta: [{ name: 'description', content: 'Async description' }],
      })
      await waitForDomUpdate()

      expect([...head.entries.values()].filter((e: any) => e._streamed)).toEqual([])

      active.dispose()
      await waitForDomUpdate()
      expect(document.title).not.toBe('Async page')
    })

    it('keeps a streamed htmlAttrs entry whose props no client entry merges', async () => {
      const { document } = setupStreamingDom([
        { htmlAttrs: { 'data-theme': 'dark' } },
      ])

      const head = createStreamableHead()!
      await waitForDomUpdate()

      // A different entry owns htmlAttrs but with different props.
      head.push({ htmlAttrs: { lang: 'en' } })
      await waitForDomUpdate()

      expect([...head.entries.values()].filter((e: any) => e._streamed)).toHaveLength(1)
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })

    it('releases a streamed entry a client patch covers', async () => {
      const { document } = setupStreamingDom([
        { title: 'Async page', meta: [{ name: 'description', content: 'Async description' }] },
      ])

      const head = createStreamableHead()!
      await waitForDomUpdate()

      const active = head.push({ title: 'Async page' })
      await waitForDomUpdate()

      expect([...head.entries.values()].filter((e: any) => e._streamed)).toHaveLength(1)

      // The reactive update never re-enters push, so it must still release.
      active.patch({
        title: 'Async page',
        meta: [{ name: 'description', content: 'Async description' }],
      })
      await waitForDomUpdate()

      expect([...head.entries.values()].filter((e: any) => e._streamed)).toEqual([])

      active.dispose()
      await waitForDomUpdate()

      expect(document.title).not.toBe('Async page')
      expect(document.querySelector('meta[name="description"]')).toBeNull()
    })

    it('releases a streamed entry whose class and style the client supersedes', async () => {
      const { document } = setupStreamingDom([
        { htmlAttrs: { class: 'page', style: 'color:red' } },
      ])

      const head = createStreamableHead()!
      const active = head.push({
        htmlAttrs: { class: 'page dark', style: 'color:red;padding:10px' },
      })
      await waitForDomUpdate()

      expect([...head.entries.values()].filter((e: any) => e._streamed)).toEqual([])

      active.dispose()
      await waitForDomUpdate()

      expect(document.documentElement.className).not.toContain('page')
      expect(document.documentElement.getAttribute('style') ?? '').not.toContain('color')
    })

    it('releases a streamed htmlAttrs entry an identical client entry merges', async () => {
      const { document } = setupStreamingDom([
        { htmlAttrs: { 'data-theme': 'dark' } },
      ])

      const head = createStreamableHead()!
      await waitForDomUpdate()

      const active = head.push({ htmlAttrs: { 'data-theme': 'dark' } })
      await waitForDomUpdate()

      expect([...head.entries.values()].filter((e: any) => e._streamed)).toEqual([])

      active.dispose()
      await waitForDomUpdate()
      expect(document.documentElement.getAttribute('data-theme')).toBeNull()
    })
  })

  describe('style tag updates with key', () => {
    it('updates style innerHTML when pushing styles with same key', async () => {
      const { window, document } = setupStreamingDom([])

      createStreamableHead()
      await waitForDomUpdate()

      // First push - creates style element (push expects array of entries)
      window.__unhead__.push([{
        style: [{ key: 'progress', innerHTML: '.progress{width:10%}' }],
      }])
      await waitForDomUpdate()

      let styles = document.querySelectorAll('style')
      expect(styles.length).toBe(1)
      expect(styles[0].innerHTML).toBe('.progress{width:10%}')

      // Second push with same key - should update, not create new
      window.__unhead__.push([{
        style: [{ key: 'progress', innerHTML: '.progress{width:50%}' }],
      }])
      await waitForDomUpdate()

      styles = document.querySelectorAll('style')
      expect(styles.length).toBe(1)
      expect(styles[0].innerHTML).toBe('.progress{width:50%}')

      // Third push with same key
      window.__unhead__.push([{
        style: [{ key: 'progress', innerHTML: '.progress{width:100%}' }],
      }])
      await waitForDomUpdate()

      styles = document.querySelectorAll('style')
      expect(styles.length).toBe(1)
      expect(styles[0].innerHTML).toBe('.progress{width:100%}')
    })

    it('creates separate styles for different keys', async () => {
      const { window, document } = setupStreamingDom([])

      createStreamableHead()
      await waitForDomUpdate()

      window.__unhead__.push([{
        style: [{ key: 'one', innerHTML: '.one{color:red}' }],
      }])
      await waitForDomUpdate()

      window.__unhead__.push([{
        style: [{ key: 'two', innerHTML: '.two{color:blue}' }],
      }])
      await waitForDomUpdate()

      const styles = document.querySelectorAll('style')
      expect(styles.length).toBe(2)
    })
  })
})

describe('batching under an async listener', () => {
  it('batches even when a listener returns a promise', async () => {
    const { window, document } = setupStreamingDom([])
    const head = createStreamableHead({
      hooks: {
        'entries:updated': () => Promise.resolve(),
      },
    })!
    await waitForDomUpdate()

    let renders = 0
    const render = head.render
    head.render = () => {
      renders++
      return render()
    }

    window.__unhead__.push([
      { title: 'Async listener' },
      { meta: [{ name: 'description', content: 'x' }] },
      { link: [{ rel: 'canonical', href: '/' }] },
    ])
    await waitForDomUpdate()

    expect(document.title).toBe('Async listener')
    expect(document.querySelector('link[rel="canonical"]')).toBeTruthy()
    expect(renders).toBe(1)
  })

  it('batches when every listener is synchronous', async () => {
    const { window, document } = setupStreamingDom([])
    const head = createStreamableHead({
      hooks: {
        'entries:updated': () => {},
      },
    })!
    await waitForDomUpdate()

    let renders = 0
    const render = head.render
    head.render = () => {
      renders++
      return render()
    }

    window.__unhead__.push([{ title: 'Sync listener' }, { meta: [{ name: 'description', content: 'x' }] }])
    await waitForDomUpdate()

    expect(renders).toBe(1)
    expect(document.title).toBe('Sync listener')
  })
})
