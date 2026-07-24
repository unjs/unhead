import { describe, expect, it } from 'vitest'
import { useSeoMeta } from '../../src/composables'
import { parseAttributes } from '../../src/parser'
import { useScript } from '../../src/scripts'
import { createHead } from '../../src/server'
import { resolveTags } from '../../src/utils'
import { withoutObjectHasOwn } from '../fixtures'

describe('browser compatibility', () => {
  it('normalizes SEO meta without Object.hasOwn', () => {
    const head = createHead()
    withoutObjectHasOwn(() => {
      useSeoMeta(head, { description: 'Compatible' })
    })

    expect(resolveTags(head)).toContainEqual(expect.objectContaining({
      props: {
        content: 'Compatible',
        name: 'description',
      },
      tag: 'meta',
    }))
  })

  it('parses attributes without Object.hasOwn', () => {
    const attributes = withoutObjectHasOwn(() => {
      return parseAttributes('name="description" content="Compatible"')
    })

    expect(attributes).toEqual({
      content: 'Compatible',
      name: 'description',
    })
  })

  it('deduplicates scripts without Object.hasOwn', () => {
    const head = createHead()
    const [first, second] = withoutObjectHasOwn(() => {
      return [
        useScript(head, '/compatible.js', { trigger: 'manual' }),
        useScript(head, '/compatible.js', { trigger: 'manual' }),
      ] as const
    })

    expect(first).toBe(second)
  })
})
