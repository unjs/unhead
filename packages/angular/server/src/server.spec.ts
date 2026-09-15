import type { EnvironmentInjector } from '@angular/core'
import type { Unhead } from 'unhead/types'
import { DOCUMENT } from '@angular/common'
import { createEnvironmentInjector, Injector } from '@angular/core'
import { BEFORE_APP_SERIALIZED, ɵDominoAdapter as DominoAdapter } from '@angular/platform-server'
import { UnheadInjectionToken } from '@unhead/angular'
import { afterEach, describe, expect, it } from 'vitest'
import { provideServerHead } from './server'

interface SSRRequest {
  document: Document
  head: Unhead
  injector: EnvironmentInjector
  render: () => Promise<string>
}

const injectors: EnvironmentInjector[] = []

function createRequest(requestDocument = document.implementation.createHTMLDocument()): SSRRequest {
  requestDocument.body.innerHTML = '<main>SSR app</main>'

  const injector = createEnvironmentInjector([
    { provide: DOCUMENT, useValue: requestDocument },
    provideServerHead({ disableDefaults: true }),
  ], Injector.NULL)

  injectors.push(injector)

  const head = injector.get(UnheadInjectionToken)
  const callbacks = injector.get(BEFORE_APP_SERIALIZED)

  return {
    document: requestDocument,
    head,
    injector,
    async render() {
      for (const callback of callbacks)
        await callback()
      return requestDocument.documentElement.outerHTML
    },
  }
}

function pushRequestHead(head: Unhead, id: string) {
  head.push({
    title: `Request ${id}`,
    meta: [
      { name: `request-${id.toLowerCase()}`, content: id },
    ],
  })
}

describe('provideServerHead', () => {
  afterEach(() => {
    while (injectors.length)
      injectors.pop()!.destroy()
  })

  it('creates an isolated head for each sequential server injector render', async () => {
    const requestA = createRequest()
    pushRequestHead(requestA.head, 'A')

    const htmlA = await requestA.render()

    const requestB = createRequest()
    pushRequestHead(requestB.head, 'B')

    const htmlB = await requestB.render()

    expect(requestB.head).not.toBe(requestA.head)
    expect(requestB.injector.get(UnheadInjectionToken)).toBe(requestB.head)
    expect(htmlA).toContain('<title>Request A</title>')
    expect(htmlA).toContain('name="request-a"')
    expect(htmlB).toContain('<title>Request B</title>')
    expect(htmlB).toContain('name="request-b"')
    expect(htmlB).not.toContain('Request A')
    expect(htmlB).not.toContain('name="request-a"')
  })

  it('keeps concurrent server injector renders isolated', async () => {
    const requestA = createRequest()
    const requestB = createRequest()

    pushRequestHead(requestA.head, 'A')
    pushRequestHead(requestB.head, 'B')

    const [htmlA, htmlB] = await Promise.all([
      requestA.render(),
      requestB.render(),
    ])

    expect(requestB.head).not.toBe(requestA.head)
    expect(htmlA).toContain('<title>Request A</title>')
    expect(htmlA).toContain('name="request-a"')
    expect(htmlA).not.toContain('Request B')
    expect(htmlA).not.toContain('name="request-b"')
    expect(htmlB).toContain('<title>Request B</title>')
    expect(htmlB).toContain('name="request-b"')
    expect(htmlB).not.toContain('Request A')
    expect(htmlB).not.toContain('name="request-a"')
  })

  describe.each([
    { environment: 'browser', createDocument: () => document.implementation.createHTMLDocument() },
    { environment: 'Angular server', createDocument: () => new DominoAdapter().createHtmlDocument() },
  ])('$environment attributes', ({ createDocument }) => {
    it.each([false, null])('removes initial attributes explicitly omitted with %j', async (value) => {
      const request = createRequest(createDocument())
      for (const element of [request.document.documentElement, request.document.body]) {
        element.setAttribute('data-example', 'initial')
        element.setAttribute('class', 'initial')
        element.setAttribute('style', 'color:red')
        element.setAttribute('lang', 'en')
      }
      const attrs = { 'data-example': value, 'class': value, 'style': value }
      request.head.push({ htmlAttrs: { attrs }, bodyAttrs: { attrs } })

      await request.render()

      for (const element of [request.document.documentElement, request.document.body]) {
        expect(element.getAttribute('data-example')).toBeNull()
        expect(element.getAttribute('class')).toBeNull()
        expect(element.getAttribute('style')).toBeNull()
        expect(element.getAttribute('lang')).toBe('en')
      }
    })

    it.each([
      { name: 'class', value: ' first  second\tthird\nfourth ' },
      { name: 'style', value: 'background-image:url("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=");color:red' },
      { name: 'data-copy', value: '&copy; "quoted" & <text>' },
    ])('preserves literal $name values on html and body', async ({ name, value }) => {
      const request = createRequest(createDocument())
      request.head.push({
        htmlAttrs: { attrs: { [name]: value } },
        bodyAttrs: { attrs: { [name]: value } },
      })

      await request.render()

      expect(request.document.documentElement.getAttribute(name)).toBe(value)
      expect(request.document.body.getAttribute(name)).toBe(value)
    })

    it('preserves attribute values across repeated and isolated request renders', async () => {
      const requestA = createRequest(createDocument())
      const requestB = createRequest(createDocument())
      requestA.head.push({ htmlAttrs: { attrs: { 'data-copy': '&copy; "A"' } } })
      requestB.head.push({ htmlAttrs: { attrs: { 'data-copy': '&copy; "B"' } } })

      const [htmlA, htmlB] = await Promise.all([requestA.render(), requestB.render()])
      const repeatedA = await requestA.render()

      expect(repeatedA).toBe(htmlA)
      expect(htmlA).toContain('data-copy="&amp;copy; &quot;A&quot;"')
      expect(htmlB).toContain('data-copy="&amp;copy; &quot;B&quot;"')
      expect(requestA.document.documentElement.getAttribute('data-copy')).toBe('&copy; "A"')
      expect(requestB.document.documentElement.getAttribute('data-copy')).toBe('&copy; "B"')
    })

    it('merges structured attributes with the initial document', async () => {
      const request = createRequest(createDocument())
      request.document.documentElement.setAttribute('lang', 'en')
      request.document.documentElement.setAttribute('class', 'baseline')
      request.document.body.setAttribute('style', 'color:red')
      request.document.body.setAttribute('data-template', 'initial')
      request.head.push({
        htmlAttrs: { class: ['app'], dir: 'ltr' },
        bodyAttrs: { style: { background: 'blue' } },
      })

      await request.render()

      expect(request.document.documentElement.getAttribute('lang')).toBe('en')
      expect(request.document.documentElement.getAttribute('dir')).toBe('ltr')
      expect(request.document.documentElement.getAttribute('class')).toBe('baseline app')
      expect(request.document.body.style.color).toBe('red')
      expect(request.document.body.style.background).toBe('blue')
      expect(request.document.body.getAttribute('data-template')).toBe('initial')
    })
  })
})
