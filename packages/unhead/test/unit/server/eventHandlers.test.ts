import { describe, it } from 'vitest'
import { useHead } from '../../../src'
import { renderSSRHead } from '../../../src/server'
import { createServerHeadWithContext } from '../../util'

describe('ssr event handlers', () => {
  it('basic', async () => {
    const head = createServerHeadWithContext()

    useHead(head, {
      script: [
        {
          src: 'https://js.stripe.com/v3/',
          defer: true,
          // eslint-disable-next-line no-console
          onload: () => console.log('loaded stripe'),
        },
      ],
    })

    const ctx = renderSSRHead(head)
    expect(ctx).toMatchInlineSnapshot(`
      {
        "bodyAttrs": "",
        "bodyTags": "",
        "bodyTagsOpen": "",
        "headTags": "<script src="https://js.stripe.com/v3/" defer onload="this.dataset.onloadfired = true"></script>",
        "htmlAttrs": "",
      }
    `)
  })
})
