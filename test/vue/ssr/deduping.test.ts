import { describe } from 'vitest'
import { useHead } from '@unhead/vue'
import { ssrRenderHeadToString } from '../util'

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

    expect(headResult.headTags).toMatchInlineSnapshot('"<script data-hid=\\"722c761\\">console.log(\'B\')</script>"')
  })
})
