import { describe, it } from 'vitest'
import { useDelayedSerializedDom, useDOMHead } from '../../../../test/unhead/dom/util'
import { useScript } from '../../src/useScript'

describe('dom useScript', () => {
  it('basic', async () => {
    useDOMHead()

    let calledFn
    const instance = useScript({
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

    expect((await useDelayedSerializedDom()).split('\n').filter(l => l.startsWith('<link'))).toMatchInlineSnapshot(`
      [
        "<link href="https://cdn.example.com/script.js" rel="preload" crossorigin="anonymous" referrerpolicy="no-referrer" fetchpriority="low" as="script"><script data-onload="" data-onerror="" defer="" fetchpriority="low" crossorigin="anonymous" referrerpolicy="no-referrer" src="https://cdn.example.com/script.js" data-hid="c5c65b0"></script></head>",
      ]
    `)

    instance.proxy.test('hello-world')
    expect(calledFn).toBe('test')
  })
  it('proxy', async () => {
    const head = useDOMHead()

    const instance = useScript<{ test: (foo: string) => string }>({
      src: 'https://cdn.example.com/script.js',
      head,
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
    useDOMHead()

    const instance = useScript<{ test: (foo: string) => void }>({
      src: 'https://cdn.example.com/script.js',
    })

    let dom = await useDelayedSerializedDom()
    expect(dom.split('\n').filter(l => l.trim().startsWith('<script'))).toMatchInlineSnapshot(`[]`)
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
        "<script data-onload="" data-onerror="" defer="" fetchpriority="low" crossorigin="anonymous" referrerpolicy="no-referrer" src="https://cdn.example.com/script.js" data-hid="c5c65b0"></script></head>",
      ]
    `)
  })
})
