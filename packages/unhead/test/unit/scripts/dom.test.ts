import { describe, it } from 'vitest'
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
  it('remove & re-add', async () => {
    const head = useDOMHead()

    const instance = useScript<{ test: (foo: string) => void }>(head, {
      src: 'https://cdn.example.com/script.js',
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
    // reload
    instance.load()
    await new Promise(r => setTimeout(r, 100))
    dom = await useDelayedSerializedDom()
    expect(dom.split('\n').filter(l => l.trim().startsWith('<script'))).toMatchInlineSnapshot(`
      [
        "<script defer="" fetchpriority="low" crossorigin="anonymous" referrerpolicy="no-referrer" src="https://cdn.example.com/script.js" data-onload="" data-onerror=""></script></head>",
      ]
    `)
  })
})
