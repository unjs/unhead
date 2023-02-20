import { createHead } from 'unhead'
import { renderSSRHead } from '@unhead/ssr'

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
        "headTags": "<script src=\\"/my-important-script.js\\"></script>
      <meta property=\\"unhead:ssr\\" content=\\"4ce05e0\\">",
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
        "headTags": "<meta property=\\"unhead:ssr\\" content=\\"4ce05e0\\">",
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
        "headTags": "<meta property=\\"unhead:ssr\\" content=\\"4ce05e0\\">",
        "htmlAttrs": "",
      }
    `)
  })
})
