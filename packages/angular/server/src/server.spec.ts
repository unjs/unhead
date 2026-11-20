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

  it('applies root attribute names and values to the Angular server document', async () => {
    const request = createRequest(new DominoAdapter().createHtmlDocument())
    request.document.documentElement.setAttribute('xml:lang', 'en')
    request.document.body.setAttribute('data-template', 'A & B')
    request.head.push({
      bodyAttrs: { 'data-label': 'A "quoted" value' },
    })

    await request.render()

    expect(request.document.documentElement.getAttribute('xml:lang')).toBe('en')
    expect(request.document.documentElement.getAttribute('xml')).toBeNull()
    expect(request.document.documentElement.getAttribute('lang')).toBeNull()
    expect(request.document.body.getAttribute('data-label')).toBe('A "quoted" value')
    expect(request.document.body.getAttribute('data-template')).toBe('A & B')
  })

  it('preserves attribute names accepted by the HTML parser', async () => {
    const request = createRequest(new DominoAdapter().createHtmlDocument())
    request.document.body.outerHTML = '<body @state="ready"><main>SSR app</main></body>'

    await request.render()

    expect(request.document.body.getAttribute('@state')).toBe('ready')
  })

  it('uses HTML whitespace to split classes', async () => {
    const request = createRequest(new DominoAdapter().createHtmlDocument())
    request.head.push({ bodyAttrs: { class: 'first&#9;second' } })

    await request.render()

    expect(request.document.body.className).toBe('first second')
  })

  it('updates an existing namespaced root attribute in place', async () => {
    const request = createRequest()
    const namespace = 'http://www.w3.org/2000/xmlns/'
    request.document.documentElement.setAttributeNS(namespace, 'xmlns', 'urn:initial')
    const htmlAttrs = { xmlns: 'urn:updated', lang: 'en' }
    request.head.push({ htmlAttrs })

    await request.render()

    expect(request.document.documentElement.getAttribute('xmlns')).toBe('urn:updated')
    expect(request.document.documentElement.getAttributeNS(namespace, 'xmlns')).toBe('urn:updated')
  })

  it('registers the rendered root ID in the Angular server document', async () => {
    const request = createRequest(new DominoAdapter().createHtmlDocument())
    request.head.push({ htmlAttrs: { id: 'root' } })

    await request.render()

    expect(request.document.getElementById('root')).toBe(request.document.documentElement)
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
})
