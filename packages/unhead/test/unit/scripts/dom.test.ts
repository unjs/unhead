import { describe, expect, it } from 'vitest'
import { useScript } from '../../../src/composables'
import { getActiveDom, useDelayedSerializedDom, useDOMHead } from '../../../test/util'

describe('dom useScript', () => {
  it('basic', async () => {
    const head = useDOMHead()

    let calledFn
    const instance = useScript<{ test: (s: string) => void }>(head, {
      src: 'https://cdn.example.com/script.js',
    }, {
      use() {
        return {
          test: () => {
            calledFn = 'test'
            return 'foo'
          },
        }
      },
    })

    expect((await useDelayedSerializedDom()).split('\n').filter(l => l.startsWith('<link'))).toMatchInlineSnapshot(`[]`)

    instance.proxy.test('hello-world')
    expect(calledFn).toBe('test')
  })
  it('proxy', async () => {
    const head = useDOMHead()

    const instance = useScript<{ test: (foo: string) => string }>(head, {
      src: 'https://cdn.example.com/script.js',
    }, {
      use() {
        return {
          test: (foo: string) => foo,
        }
      },
    })

    expect(instance.proxy.test('hello-world')).toEqual('hello-world')
  })
  it.each([
    ['http-script.js', [null, null]],
    ['http:cdn.example/x.js', ['anonymous', 'no-referrer']],
    ['http:http-base.invalid/..', ['anonymous', 'no-referrer']],
    ['http:a/..', ['anonymous', 'no-referrer']],
    ['http:/cdn.example/x.js', ['anonymous', 'no-referrer']],
    ['http:\\cdn.example/x.js', ['anonymous', 'no-referrer']],
    ['https:cdn.example/x.js', ['anonymous', 'no-referrer']],
    ['https:https-base.invalid/..', ['anonymous', 'no-referrer']],
    ['https:b/..', ['anonymous', 'no-referrer']],
    ['https:/cdn.example/x.js', ['anonymous', 'no-referrer']],
    ['https:\\cdn.example/x.js', ['anonymous', 'no-referrer']],
    ['/\\cdn.example.com/x.js', ['anonymous', 'no-referrer']],
    [' https://cdn.example.com/script.js ', ['anonymous', 'no-referrer']],
  ])('keeps preload privacy attributes aligned for %s', async (src, expected) => {
    const head = useDOMHead()

    useScript(head, src)
    await useDelayedSerializedDom()

    const document = getActiveDom()!.window.document
    const script = document.querySelector('script')
    const preload = document.querySelector('link[rel="preload"]')
    expect(script).not.toBeNull()
    expect(preload).not.toBeNull()
    expect([
      script!.getAttribute('crossorigin'),
      script!.getAttribute('referrerpolicy'),
    ]).toEqual(expected)
    expect([
      preload!.getAttribute('crossorigin'),
      preload!.getAttribute('referrerpolicy'),
    ]).toEqual(expected)
  })
  it.each([
    ['https://app.example/', 'http:cdn.example/x.js', ['anonymous', 'no-referrer']],
    ['http://app.example/', 'http:cdn.example/x.js', [null, null]],
    ['http://app.example/', 'https:cdn.example/x.js', ['anonymous', 'no-referrer']],
    ['https://app.example/', 'https:cdn.example/x.js', [null, null]],
  ])('uses document %s for privacy defaults from %s', async (baseURI, src, expected) => {
    const head = useDOMHead()
    const document = getActiveDom()!.window.document
    const base = document.createElement('base')
    base.href = baseURI
    document.head.append(base)

    useScript(head, src)
    await useDelayedSerializedDom()

    const script = document.querySelector('script')
    const preload = document.querySelector('link[rel="preload"]')
    expect([
      script!.getAttribute('crossorigin'),
      script!.getAttribute('referrerpolicy'),
    ]).toEqual(expected)
    expect([
      preload!.getAttribute('crossorigin'),
      preload!.getAttribute('referrerpolicy'),
    ]).toEqual(expected)
  })
  it('defaults undefined privacy fields on object input', async () => {
    const head = useDOMHead()

    useScript(head, {
      src: 'https://cdn.example.com/script.js',
      crossorigin: undefined,
      referrerpolicy: undefined,
    })
    await useDelayedSerializedDom()

    const document = getActiveDom()!.window.document
    const script = document.querySelector('script')
    const preload = document.querySelector('link[rel="preload"]')
    expect([
      script!.getAttribute('crossorigin'),
      script!.getAttribute('referrerpolicy'),
    ]).toEqual(['anonymous', 'no-referrer'])
    expect([
      preload!.getAttribute('crossorigin'),
      preload!.getAttribute('referrerpolicy'),
    ]).toEqual(['anonymous', 'no-referrer'])
  })
  it('preconnects when the document proves a scheme-dependent origin', async () => {
    const head = useDOMHead()
    const document = getActiveDom()!.window.document
    const base = document.createElement('base')
    base.href = 'https://app.example/'
    document.head.append(base)

    useScript(head, 'http:cdn.example/x.js', {
      trigger: 'manual',
      warmupStrategy: 'preconnect',
    })
    await useDelayedSerializedDom()

    expect(document.querySelector('link[rel="preconnect"]')?.getAttribute('href')).toBe('http://cdn.example')
  })
  it('keeps removed handles terminal and re-adds through a new instance', async () => {
    const head = useDOMHead()
    const src = 'https://cdn.example.com/script.js'

    const instance = useScript<{ test: (foo: string) => void }>(head, {
      src,
    })

    let dom = await useDelayedSerializedDom()
    expect(dom.split('\n').filter(l => l.trim().startsWith('<script'))).toMatchInlineSnapshot(`
      [
        "<script defer="" fetchpriority="low" src="https://cdn.example.com/script.js" crossorigin="anonymous" referrerpolicy="no-referrer" data-onload="" data-onerror=""></script><link href="https://cdn.example.com/script.js" rel="preload" crossorigin="anonymous" referrerpolicy="no-referrer" fetchpriority="low" as="script"></head>",
      ]
    `)
    instance.remove()
    // wait
    await new Promise(r => setTimeout(r, 100))
    dom = await useDelayedSerializedDom()
    expect(dom.split('\n').filter(l => l.trim().startsWith('<script'))).toMatchInlineSnapshot(`[]`)
    await expect(instance.load()).resolves.toBe(false)
    await new Promise(r => setTimeout(r, 100))
    dom = await useDelayedSerializedDom()
    expect(dom.split('\n').filter(l => l.trim().startsWith('<script'))).toMatchInlineSnapshot(`[]`)
    expect(instance.entry).toBeUndefined()
    expect(head._scripts?.[src]).toBeUndefined()

    const nextInstance = useScript<{ test: (foo: string) => void }>(head, { src })
    expect(nextInstance).not.toBe(instance)
    await instance.load()
    expect(instance.entry).toBeUndefined()
    expect(head._scripts?.[src]).toBe(nextInstance)
    await new Promise(r => setTimeout(r, 100))
    dom = await useDelayedSerializedDom()
    expect(dom.split('\n').filter(l => l.trim().startsWith('<script'))).toMatchInlineSnapshot(`
      [
        "<script defer="" fetchpriority="low" src="https://cdn.example.com/script.js" crossorigin="anonymous" referrerpolicy="no-referrer" data-onload="" data-onerror=""></script><link href="https://cdn.example.com/script.js" rel="preload" crossorigin="anonymous" referrerpolicy="no-referrer" fetchpriority="low" as="script"></head>",
      ]
    `)
  })
})
