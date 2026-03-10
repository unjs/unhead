import { renderSSRHead } from '../../../src/server'
import { createServerHeadWithContext } from '../../util'

describe('titleTemplate', () => {
  it('string replace', async () => {
    const head = createServerHeadWithContext()
    head.push({
      titleTemplate: '%s - my template',
      title: 'test',
    })
    const { headTags } = renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      `"<title>test - my template</title>"`,
    )
  })
  it('fn replace', async () => {
    const head = createServerHeadWithContext()
    head.push({
      titleTemplate: (title?: string) => {
        return `${title} - my template`
      },
      title: 'test',
    })
    const { headTags } = renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      `"<title>test - my template</title>"`,
    )
  })
  it('titleTemplate as title', async () => {
    const head = createServerHeadWithContext()
    head.push({
      titleTemplate: (title?: string) => title ? `${title} - Template` : 'Default Title',
      title: null,
    })
    const { headTags } = renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      `"<title>Default Title</title>"`,
    )
  })
  it('reset title template', async () => {
    const head = createServerHeadWithContext()
    head.push({
      titleTemplate: (title?: string) => title ? `${title} - Template` : 'Default Title',
    })
    head.push({
      titleTemplate: null,
      title: 'page title',
    })
    const { headTags } = renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      `"<title>page title</title>"`,
    )
  })

  it('nested title template', async () => {
    const head = createServerHeadWithContext()
    head.push({
      titleTemplate: (title?: string) => title ? `${title} - Template` : 'Default Title',
    })
    head.push({
      titleTemplate: null,
    })
    const { headTags } = renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      '""',
    )
  })

  it('null fn return', async () => {
    const head = createServerHeadWithContext()
    head.push({
      titleTemplate: (title?: string) => title === 'test' ? null : `${title} - Template`,
      title: 'test',
    })
    const { headTags } = renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot('""')
  })

  it('empty title', async () => {
    const head = createServerHeadWithContext()
    head.push({
      title: '',
    })
    const { headTags } = renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(
      `""`,
    )
  })

  it('string template with no title renders nothing', async () => {
    const head = createServerHeadWithContext()
    head.push({
      titleTemplate: '%s - My Site',
    })
    const { headTags } = renderSSRHead(head)
    // without a title, "%s - My Site" should not render as " - My Site"
    expect(headTags).toMatchInlineSnapshot(`""`)
  })

  it('string template without %s and no title renders template as title', async () => {
    const head = createServerHeadWithContext()
    head.push({
      titleTemplate: 'My Site',
    })
    const { headTags } = renderSSRHead(head)
    expect(headTags).toMatchInlineSnapshot(`"<title>My Site</title>"`)
  })
})
