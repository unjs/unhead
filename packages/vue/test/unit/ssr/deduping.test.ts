import { useHead } from '@unhead/vue'
import { describe } from 'vitest'
import { ssrRenderHeadToString } from '../../util'

describe('vue ssr deduping', () => {
  it('script key', async () => {
    const headResult = await ssrRenderHeadToString(() => {
      useHead({
        script: [
          {
            src: 'test',
            key: 'my-script',
            innerHTML: 'console.log(\'A\')',
          },
        ],
      })
      useHead({
        script: [
          {
            key: 'my-script',
            innerHTML: 'console.log(\'B\')',
          },
        ],
      })
    })

    expect(headResult.headTags).toMatchInlineSnapshot(`"<script src="test" data-hid="my-script">console.log('B')</script>"`)
  })

  it('null attr override', async () => {
    const headResult = await ssrRenderHeadToString(() => {
      useHead({
        script: [
          {
            src: 'test',
            key: 'my-script',
            fetchpriority: 'high',
            crossorigin: 'anonymous',
            referrerpolicy: 'no-referrer-when-downgrade',
            innerHTML: 'console.log(\'A\')',
          },
        ],
      })
      useHead({
        script: [
          {
            key: 'my-script',
            fetchpriority: undefined,
            crossorigin: null,
            referrerpolicy: null,
            innerHTML: 'console.log(\'B\')',
          },
        ],
      })
    })

    expect(headResult.headTags).toMatchInlineSnapshot(`"<script src="test" fetchpriority="high" data-hid="my-script">console.log('B')</script>"`)
  })
})
