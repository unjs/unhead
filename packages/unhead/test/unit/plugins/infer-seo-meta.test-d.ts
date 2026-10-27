import type { SSRHeadPayload } from '../../../src/server'
import { expectTypeOf, it } from 'vitest'
import { InferSeoMetaPlugin } from '../../../src/plugins'
import { createHead } from '../../../src/server'

it('preserves server render types with inferred SEO metadata', () => {
  const head = createHead({
    disableDefaults: true,
    plugins: [InferSeoMetaPlugin()],
  })
  head.push({
    title: 'Title',
    meta: [{ property: 'og:image', content: 'https://example.com/og.png' }],
  })

  expectTypeOf(head.render()).toEqualTypeOf<SSRHeadPayload>()
})
