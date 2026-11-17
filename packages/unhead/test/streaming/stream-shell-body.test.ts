import { JSDOM } from 'jsdom'
import { createStreamableHead, prepareStreamingTemplate, prepareTemplate, renderSSRHeadShell } from 'unhead/stream/server'
import { describe, expect, it } from 'vitest'

describe('streaming shell bodyOpen tags', () => {
  it.each([false, true])('preserves bodyOpen when a template cannot split, prepared: %s', (prepared) => {
    const { head } = createStreamableHead({
      init: [{ script: [{ id: 'body-open', src: '/open.js', tagPosition: 'bodyOpen' }] }],
    })
    const source = '<html><head></head><body><main>App</main>'
    const { shell, end } = prepareStreamingTemplate(head, prepared ? prepareTemplate(source) : source)
    const document = new JSDOM(shell + end).window.document

    expect([...document.body.children].map(element => element.tagName)).toEqual(['SCRIPT', 'MAIN'])
    expect(document.querySelectorAll('#body-open')).toHaveLength(1)
  })

  it('preserves bodyOpen in a directly rendered shell', () => {
    const { head } = createStreamableHead({
      init: [{ script: [{ id: 'body-open', src: '/open.js', tagPosition: 'bodyOpen' }] }],
    })
    const html = renderSSRHeadShell(head, '<html><head></head><body><main>App</main></body></html>')
    const document = new JSDOM(html).window.document

    expect([...document.body.children].map(element => element.tagName)).toEqual(['SCRIPT', 'MAIN'])
    expect(document.querySelectorAll('#body-open')).toHaveLength(1)
  })
})
