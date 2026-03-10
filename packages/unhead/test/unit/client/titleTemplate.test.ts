import { renderDOMHead } from '../../../src/client'
import { createClientHeadWithContext, useDom } from '../../util'

const JETFLY_RE = /^ — /

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
      `"test - my template"`,
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
      `"test - my template"`,
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
      `"Default Title"`,
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
    expect(dom.window.document.title).toMatchInlineSnapshot(`"Default Title"`)
    const entry = head.push({
      title: 'Hello world',
    })
    renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toMatchInlineSnapshot(`"Hello world - Template"`)
    entry.dispose()
    renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toMatchInlineSnapshot(`"Default Title"`)
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
    expect(dom.window.document.title).toMatchInlineSnapshot(`"page title"`)
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
  it('string template with no title renders nothing', async () => {
    const dom = useDom()
    const head = createClientHeadWithContext({
      document: dom.window.document,
    })
    head.push({
      titleTemplate: '%s - My Site',
    })
    renderDOMHead(head, { document: dom.window.document })
    // without a title, "%s - My Site" should not render as " - My Site"
    expect(dom.window.document.title).toMatchInlineSnapshot(`""`)
  })

  it('string template without %s and no title renders template as title', async () => {
    const dom = useDom()
    const head = createClientHeadWithContext({
      document: dom.window.document,
    })
    head.push({
      titleTemplate: 'My Site',
    })
    renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toMatchInlineSnapshot(`"My Site"`)
  })

  it('#513', async () => {
    const dom = useDom()
    createClientHeadWithContext({
      document: dom.window.document,
      init: [
        { titleTemplate: title => `${title ?? ''} — Jetfly Group`.replace(JETFLY_RE, '') },
      ],
    })

    // wait
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(dom.window.document.title).toMatchInlineSnapshot(`"Jetfly Group"`)
  })
})
