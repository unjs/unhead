import type { EnvironmentInjector } from '@angular/core'
import type { Unhead } from 'unhead/types'
import { DOCUMENT } from '@angular/common'
import { createEnvironmentInjector, Injector } from '@angular/core'
import { BEFORE_APP_SERIALIZED } from '@angular/platform-server'
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

function createRequest(): SSRRequest {
  const requestDocument = document.implementation.createHTMLDocument()
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
})
