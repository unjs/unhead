import { useHead } from '../src'
import { ssrRenderHeadToString } from './shared/utils'

describe('titleTemplate', () => {
  test('string replace', async () => {
    const titleTemplate = '%s - my template'
    const headResult = await ssrRenderHeadToString(() => {
      useHead({
        titleTemplate,
        title: 'test',
      })
    })
    expect(headResult.headTags).toMatchInlineSnapshot(
      '"<title>test - my template</title><meta name=\\"head:count\\" content=\\"0\\">"',
    )
  })
  test('fn replace', async () => {
    const titleTemplate = (title?: string) => `${title} - my template`
    const headResult = await ssrRenderHeadToString(() => {
      useHead({
        titleTemplate,
        title: 'test',
      })
    })
    expect(headResult.headTags).toMatchInlineSnapshot(
      '"<title>test - my template</title><meta name=\\"head:count\\" content=\\"0\\">"',
    )
  })
  test('titleTemplate as title', async () => {
    const titleTemplate = (title?: string) => title ? `${title} - Template` : 'Default Title'
    const headResult = await ssrRenderHeadToString(() => {
      useHead({
        titleTemplate,
        title: null,
      })
    })
    expect(headResult.headTags).toMatchInlineSnapshot(
      '"<title>Default Title</title><meta name=\\"head:count\\" content=\\"0\\">"',
    )
  })
  test('reset title template', async () => {
    const titleTemplate = (title?: string) => title ? `${title} - Template` : 'Default Title'
    const headResult = await ssrRenderHeadToString(() => {
      useHead({
        titleTemplate,
      })
      useHead({
        // resets the titleTemplate
        titleTemplate: null,
        title: 'page title',
      })
    })
    expect(headResult.headTags).toMatchInlineSnapshot(
      '"<title>page title</title><meta name=\\"head:count\\" content=\\"0\\">"',
    )
  })

  test('nested title template', async () => {
    const titleTemplate = (title?: string | null) => title ? `${title} - Template` : 'Default Title'
    const headResult = await ssrRenderHeadToString(() => {
      useHead({
        titleTemplate,
      })
      useHead({
        titleTemplate: null,
      })
    })
    expect(headResult.headTags).toMatchInlineSnapshot(
      '"<meta name=\\"head:count\\" content=\\"0\\">"',
    )
  })

  test('null fn return', async () => {
    const titleTemplate = (title?: string | null) => title === 'test' ? null : `${title} - Template`
    const headResult = await ssrRenderHeadToString(() => {
      useHead({
        titleTemplate,
        title: 'test',
      })
    })
    expect(headResult.headTags).toMatchInlineSnapshot(
      '"<meta name=\\"head:count\\" content=\\"0\\">"',
    )
  })

  test('empty title', async () => {
    const headResult = await ssrRenderHeadToString(() => {
      useHead({
        title: '',
      })
    })
    expect(headResult.headTags).toMatchInlineSnapshot(
      '"<title></title><meta name=\\"head:count\\" content=\\"0\\">"',
    )
  })
})
