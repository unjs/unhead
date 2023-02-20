import { describe, it } from 'vitest'
import { createHead } from 'unhead'
import { renderSSRHead } from '@unhead/ssr'

describe('ssr innerHTML', () => {
  it('json', async () => {
    const head = createHead()
    head.push({
      script: [
        {
          innerHTML: {
            test: 'test',
            something: {
              else: 123,
            },
          },
        },
      ],
    })
    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<script>{\\"test\\":\\"test\\",\\"something\\":{\\"else\\":123}}</script>
      <meta property=\\"unhead:ssr\\" content=\\"6282324\\">",
        "htmlAttrs": "",
      }
    `)
  })

  it('noscript', async () => {
    const head = createHead()
    head.push({
      noscript: [
        {
          children: `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXX"
    height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
        },
      ],
    })
    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<noscript><iframe src=\\"https://www.googletagmanager.com/ns.html?id=GTM-XXXXXX\\"
          height=\\"0\\" width=\\"0\\" style=\\"display:none;visibility:hidden\\"></iframe></noscript>
      <meta property=\\"unhead:ssr\\" content=\\"b97d7c6\\">",
        "htmlAttrs": "",
      }
    `)
  })
})
