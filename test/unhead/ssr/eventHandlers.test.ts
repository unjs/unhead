import { describe, it } from 'vitest'
import { createHead, useHead } from 'unhead'
import { renderSSRHead } from '@unhead/ssr'

describe('ssr event handlers', () => {
  it('basic', async () => {
    const head = createHead()

    useHead({
      script: [
        {
          src: 'https://js.stripe.com/v3/',
          defer: true,
          // eslint-disable-next-line no-console
          onload: () => console.log('loaded stripe'),
        },
      ],
    })

    const ctx = await renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<script src=\\"https://js.stripe.com/v3/\\" defer onload=\\"this.dataset.onload = true\\"></script>",
        "htmlAttrs": "",
      }
    `)
  })
})
