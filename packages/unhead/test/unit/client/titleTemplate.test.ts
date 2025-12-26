import { renderDOMHead } from '../../../src/client'
import { createClientHeadWithContext, useDom } from '../../util'

describe('titleTemplate', () => {
  it('string replace', async () => {
    const dom = useDom()
    const head = createClientHeadWithContext({
      document: dom.window.document,
    })
    head.push({
      titleTemplate: '%s - my template',
      title: 'test',
    })

    renderDOMHead(head, { document: dom.window.document })

    expect(dom.window.document.title).toMatchInlineSnapshot(
      `""`,
    )
  })
  it('fn replace', async () => {
    const dom = useDom()
    const head = createClientHeadWithContext({
      document: dom.window.document,
    })
    head.push({
      titleTemplate: (title?: string) => `${title} - my template`,
      title: 'test',
    })
    renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toMatchInlineSnapshot(
      `""`,
    )
  })
  it('titleTemplate as title', async () => {
    const dom = useDom()
    const head = createClientHeadWithContext({
      document: dom.window.document,
    })
    head.push({
      titleTemplate: (title?: string) => title ? `${title} - Template` : 'Default Title',
      title: null,
    })
    renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toMatchInlineSnapshot(
      `""`,
    )
  })
  // TODO convert to client
  it('titleTemplate as title - update', async () => {
    const dom = useDom()
    const head = createClientHeadWithContext({
      document: dom.window.document,
    })
    head.push({
      titleTemplate: (title?: string) => title ? `${title} - Template` : 'Default Title',
    })
    renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toMatchInlineSnapshot(`""`)
    const entry = head.push({
      title: 'Hello world',
    })
    renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toMatchInlineSnapshot(`""`)
    entry.dispose()
    renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toMatchInlineSnapshot(`""`)
  })
  it('reset title template', async () => {
    const dom = useDom()
    const head = createClientHeadWithContext({
      document: dom.window.document,
    })
    head.push({
      titleTemplate: (title?: string) => title ? `${title} - Template` : 'Default Title',
    })
    head.push({
      titleTemplate: null,
      title: 'page title',
    })
    renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toMatchInlineSnapshot(`""`)
  })

  it('nested title template', async () => {
    const dom = useDom()
    const head = createClientHeadWithContext({
      document: dom.window.document,
    })
    head.push({
      titleTemplate: (title?: string) => title ? `${title} - Template` : 'Default Title',
    })
    head.push({
      titleTemplate: null,
    })
    renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toMatchInlineSnapshot(`""`)
  })

  it('null fn return', async () => {
    const dom = useDom()
    const head = createClientHeadWithContext({
      document: dom.window.document,
    })
    head.push({
      titleTemplate: (title?: string) => title === 'test' ? null : `${title} - Template`,
      title: 'test',
    })
    renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toMatchInlineSnapshot(`""`)
  })

  it('empty title', async () => {
    const dom = useDom()
    const head = createClientHeadWithContext({
      document: dom.window.document,
    })
    head.push({
      title: '',
    })
    renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toMatchInlineSnapshot(`""`)
  })

  it('replacing title with empty', async () => {
    const dom = useDom()
    const head = createClientHeadWithContext({
      document: dom.window.document,
    })
    head.push({
      title: 'test',
    })
    head.push({
      title: '',
    })
    renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toMatchInlineSnapshot(`""`)
  })
  it('#513', async () => {
    const dom = useDom()
    createClientHeadWithContext({
      document: dom.window.document,
      init: [
        { titleTemplate: title => `${title ?? ''} — Jetfly Group`.replace(/^ — /, '') },
      ],
    })

    // wait
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(dom.window.document.title).toMatchInlineSnapshot(`"Jetfly Group"`)
  })
})
