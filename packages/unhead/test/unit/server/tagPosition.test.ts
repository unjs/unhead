import { DeprecationsPlugin } from '../../../src/plugins'
import { renderSSRHead } from '../../../src/server'
import { createServerHeadWithContext } from '../../util'

describe('tagPosition', () => {
  it('head', async () => {
    const head = createServerHeadWithContext()
    head.push({
      script: [
        {
          src: '/my-important-script.js',
          tagPosition: 'head',
        },
      ],
    })
    const tags = await renderSSRHead(head)
    expect(tags).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<script src="/my-important-script.js"></script>",
        "htmlAttrs": "",
      }
    `)
  })
  it('body: true', async () => {
    const head = createServerHeadWithContext({
      plugins: [DeprecationsPlugin],
    })
    head.push({
      script: [
        {
          src: '/my-important-script.js',
          // @ts-expect-error untyped
          body: true,
        },
      ],
    })
    const tags = await renderSSRHead(head)
    expect(tags).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "<script src="/my-important-script.js"></script>",
        "bodyTagsOpen": "",
        "headTags": "",
        "htmlAttrs": "",
      }
    `)
  })
  it('bodyOpen', async () => {
    const head = createServerHeadWithContext()
    head.push({
      script: [
        {
          src: '/my-important-script.js',
          tagPosition: 'bodyOpen',
        },
      ],
    })
    const tags = await renderSSRHead(head)
    expect(tags).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "<script src="/my-important-script.js"></script>",
        "headTags": "",
        "htmlAttrs": "",
      }
    `)
  })
  it('bodyClose', async () => {
    const head = createServerHeadWithContext()
    head.push({
      script: [
        {
          src: '/my-important-script.js',
          tagPosition: 'bodyClose',
        },
      ],
    })
    const tags = await renderSSRHead(head)
    expect(tags).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "<script src="/my-important-script.js"></script>",
        "bodyTagsOpen": "",
        "headTags": "",
        "htmlAttrs": "",
      }
    `)
  })
})
