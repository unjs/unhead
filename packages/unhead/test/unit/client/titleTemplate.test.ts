import { renderDOMHead } from 'unhead/client'
import { useDom } from '../../fixtures'
import { createClientHeadWithContext } from '../../util'

describe('titleTemplate', () => {
  it('string replace', async () => {
    const head = createClientHeadWithContext()
    head.push({
      titleTemplate: '%s - my template',
      title: 'test',
    })

    const dom = useDom()
    await renderDOMHead(head, { document: dom.window.document })

    expect(dom.window.document.title).toMatchInlineSnapshot(
      `"test - my template"`,
    )
  })
  it('fn replace', async () => {
    const head = createClientHeadWithContext()
    head.push({
      titleTemplate: (title?: string) => `${title} - my template`,
      title: 'test',
    })
    const dom = useDom()
    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toMatchInlineSnapshot(
      `"test - my template"`,
    )
  })
  it('titleTemplate as title', async () => {
    const head = createClientHeadWithContext()
    head.push({
      titleTemplate: (title?: string) => title ? `${title} - Template` : 'Default Title',
      title: null,
    })
    const dom = useDom()
    await renderDOMHead(head, { document: dom.window.document })
    expect(dom.window.document.title).toMatchInlineSnapshot(
      `"Default Title"`,
    )
  })
  // TODO convert to client
  // it('titleTemplate as title - update', async () => {
  //   const head = createClientHeadWithContext()
  //   head.push({
  //     titleTemplate: (title?: string) => title ? `${title} - Template` : 'Default Title',
  //   })
  //   expect((await renderSSRHead(head)).headTags).toMatchInlineSnapshot(
  //     `"<title>Default Title</title>"`,
  //   )
  //   const entry = head.push({
  //     title: 'Hello world',
  //   })
  //   expect((await renderSSRHead(head)).headTags).toMatchInlineSnapshot(
  //     `"<title>Hello world - Template</title>"`,
  //   )
  //   entry.dispose()
  //   expect((await renderSSRHead(head)).headTags).toMatchInlineSnapshot(
  //     `"<title>Default Title</title>"`,
  //   )
  // })
  // it('reset title template', async () => {
  //   const head = createClientHeadWithContext()
  //   head.push({
  //     titleTemplate: (title?: string) => title ? `${title} - Template` : 'Default Title',
  //   })
  //   head.push({
  //     titleTemplate: null,
  //     title: 'page title',
  //   })
  //   const { headTags } = await renderSSRHead(head)
  //   expect(headTags).toMatchInlineSnapshot(
  //     `"<title>page title</title>"`,
  //   )
  // })
  //
  // it('nested title template', async () => {
  //   const head = createClientHeadWithContext()
  //   head.push({
  //     titleTemplate: (title?: string) => title ? `${title} - Template` : 'Default Title',
  //   })
  //   head.push({
  //     titleTemplate: null,
  //   })
  //   const { headTags } = await renderSSRHead(head)
  //   expect(headTags).toMatchInlineSnapshot(
  //     '""',
  //   )
  // })
  //
  // it('null fn return', async () => {
  //   const head = createClientHeadWithContext()
  //   head.push({
  //     titleTemplate: (title?: string) => title === 'test' ? null : `${title} - Template`,
  //     title: 'test',
  //   })
  //   const { headTags } = await renderSSRHead(head)
  //   expect(headTags).toMatchInlineSnapshot(
  //     '""',
  //   )
  // })
  //
  // it('empty title', async () => {
  //   const head = createClientHeadWithContext()
  //   head.push({
  //     title: '',
  //   })
  //   const { headTags } = await renderSSRHead(head)
  //   expect(headTags).toMatchInlineSnapshot(
  //     `""`,
  //   )
  // })
  //
  // it('replacing title with empty', async () => {
  //   const head = createClientHeadWithContext()
  //   head.push({
  //     title: 'test',
  //   })
  //   head.push({
  //     title: '',
  //   })
  //   const { headTags } = await renderSSRHead(head)
  //   expect(headTags).toMatchInlineSnapshot(
  //     `""`,
  //   )
  // })
})
