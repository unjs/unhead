import { createHead } from '../../../packages/unhead/src'
import { renderSSRHead } from '../../../packages/unhead/src/runtime/server'

describe('tagPosition', () => {
  test('head', async () => {
    const head = createHead()
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
        "headTags": "<script src=\\"/my-important-script.js\\"></script>",
        "htmlAttrs": "",
      }
    `)
  })
  test('head', async () => {
    const head = createHead()
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
        "bodyTagsOpen": "<script src=\\"/my-important-script.js\\"></script>",
        "headTags": "",
        "htmlAttrs": "",
      }
    `)
  })
  test('head', async () => {
    const head = createHead()
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
        "bodyTags": "<script src=\\"/my-important-script.js\\"></script>",
        "bodyTagsOpen": "",
        "headTags": "",
        "htmlAttrs": "",
      }
    `)
  })
})
