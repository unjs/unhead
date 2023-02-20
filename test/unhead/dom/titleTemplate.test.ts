import { createHead } from 'unhead'
import { renderSSRHead } from '@unhead/ssr'
import { renderDOMHead } from '@unhead/dom'
import { useDom } from '../../fixtures'

describe('titleTemplate', () => {
  test('string replace', async () => {
    const head = createHead()
    head.push({
      titleTemplate: '%s - my template',
      title: 'test',
    })

    const dom = useDom()
    await renderDOMHead(head, { document: dom.window.document })

    expect(dom.window.document.title).toMatchInlineSnapshot(
      '"test - my template"',
    )
  })
  test('fn replace', async () => {
    const head = createHead()
    head.push({
      titleTemplate: (title?: string) => `${title} - my template`,
      title: 'test',
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      `
      "<title>test - my template</title>
      <meta property=\\"unhead:ssr\\" content=\\"f2006d\\">"
    `,
    )
  })
  test('titleTemplate as title', async () => {
    const head = createHead()
    head.push({
      titleTemplate: (title?: string) => title ? `${title} - Template` : 'Default Title',
      title: null,
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      `
      "<title>Default Title</title>
      <meta property=\\"unhead:ssr\\" content=\\"f2006d\\">"
    `,
    )
  })
  test('titleTemplate as title', async () => {
    const head = createHead()
    head.push({
      titleTemplate: (title?: string) => title ? `${title} - Template` : 'Default Title',
    })
    expect((await renderSSRHead(head)).headTags).toMatchInlineSnapshot(
      `
      "<title>Default Title</title>
      <meta property=\\"unhead:ssr\\" content=\\"1c1bc8c\\">"
    `,
    )
    const entry = head.push({
      title: 'Hello world',
    })
    expect((await renderSSRHead(head)).headTags).toMatchInlineSnapshot(
      `
      "<title>Hello world - Template</title>
      <meta property=\\"unhead:ssr\\" content=\\"f2006d\\">"
    `,
    )
    entry.dispose()
    expect((await renderSSRHead(head)).headTags).toMatchInlineSnapshot(
      `
      "<title>Default Title</title>
      <meta property=\\"unhead:ssr\\" content=\\"1c1bc8c\\">"
    `,
    )
  })
  test('reset title template', async () => {
    const head = createHead()
    head.push({
      titleTemplate: (title?: string) => title ? `${title} - Template` : 'Default Title',
    })
    head.push({
      titleTemplate: null,
      title: 'page title',
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      `
      "<title>page title</title>
      <meta property=\\"unhead:ssr\\" content=\\"f2006d\\">"
    `,
    )
  })

  test('nested title template', async () => {
    const head = createHead()
    head.push({
      titleTemplate: (title?: string) => title ? `${title} - Template` : 'Default Title',
    })
    head.push({
      titleTemplate: null,
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      '"<meta property=\\"unhead:ssr\\" content=\\"\\">"',
    )
  })

  test('null fn return', async () => {
    const head = createHead()
    head.push({
      titleTemplate: (title?: string) => title === 'test' ? null : `${title} - Template`,
      title: 'test',
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      '"<meta property=\\"unhead:ssr\\" content=\\"\\">"',
    )
  })

  test('empty title', async () => {
    const head = createHead()
    head.push({
      title: '',
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      `
      "<title></title>
      <meta property=\\"unhead:ssr\\" content=\\"f2006d\\">"
    `,
    )
  })
})
