import { createHead } from 'unhead'
import { renderSSRHead } from '@unhead/ssr'

describe('titleTemplate', () => {
  it('string replace', async () => {
    const head = createHead()
    head.push({
      titleTemplate: '%s - my template',
      title: 'test',
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      '"<title>test - my template</title>"',
    )
  })
  it('fn replace', async () => {
    const head = createHead()
    head.push({
      titleTemplate: (title?: string) => `${title} - my template`,
      title: 'test',
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      '"<title>test - my template</title>"',
    )
  })
  it('titleTemplate as title', async () => {
    const head = createHead()
    head.push({
      titleTemplate: (title?: string) => title ? `${title} - Template` : 'Default Title',
      title: null,
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      '"<title>Default Title</title>"',
    )
  })
  it('reset title template', async () => {
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
      '"<title>page title</title>"',
    )
  })

  it('nested title template', async () => {
    const head = createHead()
    head.push({
      titleTemplate: (title?: string) => title ? `${title} - Template` : 'Default Title',
    })
    head.push({
      titleTemplate: null,
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      '""',
    )
  })

  it('null fn return', async () => {
    const head = createHead()
    head.push({
      titleTemplate: (title?: string) => title === 'test' ? null : `${title} - Template`,
      title: 'test',
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot('""')
  })

  it('empty title', async () => {
    const head = createHead()
    head.push({
      title: '',
    })
    const { headTags } = await renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      '"<title></title>"',
    )
  })
})
