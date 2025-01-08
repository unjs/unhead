import { useHead } from '@unhead/vue'
import { describe } from 'vitest'
import { ssrRenderHeadToString } from '../util'

describe('vue ssr innerHTML', () => {
  it('innerHTML', async () => {
    const headResult = await ssrRenderHeadToString(() => {
      useHead({
        script: [
          {
            innerHTML: 'console.log(\'hi\')',
          },
        ],
      })
    })

    expect(headResult.headTags).toMatchInlineSnapshot(
      `"<script>console.log('hi')</script>"`,
    )
  })
})
