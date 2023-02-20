import { describe } from 'vitest'
import { useHead } from '@unhead/vue'
import { ssrRenderHeadToString } from '../util'

describe('vue ssr innerContent', () => {
  test('children', async () => {
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
      `
      "<script>console.log('hi')</script>
      <meta property=\\"unhead:ssr\\" content=\\"dca45aa\\">"
    `,
    )
  })
})
