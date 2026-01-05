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
    const tags = renderSSRHead(head)
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
    const tags = renderSSRHead(head)
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
    const tags = renderSSRHead(head)
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
