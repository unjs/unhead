import { describe, expect, it } from 'vitest'
import { useScript } from '../../../src/composables'
import { useDelayedSerializedDom, useDOMHead } from '../../../test/util'

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
  it('keeps removed handles terminal and re-adds through a new instance', async () => {
    const head = useDOMHead()
    const src = 'https://cdn.example.com/script.js'

    const instance = useScript<{ test: (foo: string) => void }>(head, {
      src,
    })

    let dom = await useDelayedSerializedDom()
    expect(dom.split('\n').filter(l => l.trim().startsWith('<script'))).toMatchInlineSnapshot(`
      [
        "<script defer="" fetchpriority="low" crossorigin="anonymous" referrerpolicy="no-referrer" src="https://cdn.example.com/script.js" data-onload="" data-onerror=""></script><link href="https://cdn.example.com/script.js" rel="preload" crossorigin="anonymous" referrerpolicy="no-referrer" fetchpriority="low" as="script"></head>",
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
        "<script defer="" fetchpriority="low" crossorigin="anonymous" referrerpolicy="no-referrer" src="https://cdn.example.com/script.js" data-onload="" data-onerror=""></script><link href="https://cdn.example.com/script.js" rel="preload" crossorigin="anonymous" referrerpolicy="no-referrer" fetchpriority="low" as="script"></head>",
      ]
    `)
  })
})
