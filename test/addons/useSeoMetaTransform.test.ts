import { describe, expect, it } from 'vitest'
import { parse } from 'acorn'

import { UseSeoMetaTransform } from '../../packages/addons/src/unplugin/UseSeoMetaTransform'

const transform = async (code: string | string[], id = 'some-id.js') => {
  const plugin = UseSeoMetaTransform.vite() as any
  const res = await plugin.transform.call(
    { parse: (code: string) => parse(code, { ecmaVersion: 2022, sourceType: 'module' }) },
    Array.isArray(code) ? code.join('\n') : code,
    id,
  )
  return res?.code
}

describe('UseSeoMetaTransform', () => {
  const couldTransform = [
    'import { useSeoMeta } from \'unhead\'',
    'useSeoMeta({ title: \'Hello\', description: \'World\' })',
  ]

  it('ignores non-JS files', async () => {
    expect(await transform(couldTransform, 'test.css')).toBeUndefined()
  })

  it('transforms vue script blocks', async () => {
    expect(await transform(couldTransform, 'test.vue?type=script')).toBeDefined()
    expect(await transform(couldTransform, 'test.vue')).toBeDefined()
    expect(await transform(couldTransform, 'test.vue?type=template')).toBeUndefined()
  })

  it('preserves context for dynamic regexps', async () => {
    expect(
      await transform([
        'import { useSeoMeta } from \'unhead\'',
        'const meta = {}',
        'console.log(useSeoMeta(meta))',
      ]),
    ).not.toBeDefined()
  })

  it('statically replaces where possible', async () => {
    const code = await transform([
      'import { something } from \'other-module\'',
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ title: \'Hello\', description: \'World\'  })',
      'useSeoMeta({ title: \'Hello 2\', description: \'World 2\'  })',
    ])
    expect(code).toMatchInlineSnapshot(`
      "import { useHead } from 'unhead'
      import { something } from 'other-module'
      import { useSeoMeta } from 'unhead'
      useHead({
        title: 'Hello',
        meta: [
          { name: 'description', content: 'World' },
        ]
      })
      useHead({
        title: 'Hello 2',
        meta: [
          { name: 'description', content: 'World 2' },
        ]
      })"
    `)
  })

  it('handles reactivity', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'import { ref } from \'vue\'',
      'const someValue = { value: \'test\' }',
      'useSeoMeta({ title: \'Hello\', description: () => someValue.value, ogImage: ref(\'test\')  })',
    ])
    expect(code).toMatchInlineSnapshot(`
      "import { useHead } from 'unhead'
      import { useSeoMeta } from 'unhead'
      import { ref } from 'vue'
      const someValue = { value: 'test' }
      useHead({
        title: 'Hello',
        meta: [
          { name: 'description', content: () => someValue.value },
          { property: 'og:image', content: ref('test') },
        ]
      })"
    `)
  })

  it('handles nested objects', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ title: \'Hello\', robots: { noindex: true, nofollow: true } })',
    ])
    expect(code).toMatchInlineSnapshot('undefined')
  })

  it('handles charset', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ charset: \'utf-8\' })',
    ])
    expect(code).toMatchInlineSnapshot(`
      "import { useHead } from 'unhead'
      import { useSeoMeta } from 'unhead'
      useHead({
        meta: [
          { charset: 'utf-8' },
        ]
      })"
    `)
  })

  it('handles og:image', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      `useSeoMeta({
         ogImage: [
            {
              url: 'https://example.com/image.png',
              width: 800,
              height: 600,
              alt: 'My amazing image',
            },
          ],
      })`,
    ])
    expect(code).toMatchInlineSnapshot('undefined')
  })

  it('respects how users import library', async () => {
    const code = await transform([
      'import { useSeoMeta as usm } from \'unhead\'',
      'usm({ title: \'Hello\', description: \'World\'  })',
    ])
    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot(`
      "import { useHead } from 'unhead'
      import { useSeoMeta as usm } from 'unhead'
      useHead({
        title: 'Hello',
        meta: [
          { name: 'description', content: 'World' },
        ]
      })"
    `)
  })

  it('respects pre-existing import', async () => {
    const code = await transform([
      'import { useSeoMeta as usm, useHead } from \'unhead\'',
      'useHead({ title: \'test\', })',
      'usm({ description: \'World\'  })',
    ])
    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot(`
      "import { useSeoMeta as usm, useHead } from 'unhead'
      useHead({
        title: 'test',
      })
      useHead({
        meta: [
          { name: 'description', content: 'World' },
        ]
      })"
    `)
  })

  it('no title - useSeoMeta', async () => {
    const code = await transform([
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ description: \'World\'  })',
    ])
    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot(`
      "import { useHead } from 'unhead'
      import { useSeoMeta } from 'unhead'
      useHead({
        meta: [
          { name: 'description', content: 'World' },
        ]
      })"
    `)
  })

  it('no title - useServerSeoMeta', async () => {
    const code = await transform([
      'import { useServerSeoMeta } from \'unhead\'',
      'useServerSeoMeta({ description: \'World\'  })',
    ])
    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot(`
      "import { useHead } from 'unhead'
      import { useServerHead } from 'unhead'
      import { useServerSeoMeta } from 'unhead'
      useServerHead({
        meta: [
          { name: 'description', content: 'World' },
        ]
      })"
    `)
  })

  it('useServerSeoMeta - title', async () => {
    const code = await transform([
      'import { useServerSeoMeta, useServerHead, useHead, SomethingRandom } from \'unhead\'',
      'useServerSeoMeta({ title: \'Hello\', description: \'World\'  })',
    ])
    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot(`
      "import { useServerSeoMeta, useServerHead, useHead, SomethingRandom } from 'unhead'
      useHead({
        title: 'Hello',
      })
      useServerHead({
        meta: [
          { name: 'description', content: 'World' },
        ]
      })"
    `)
  })

  it('respects auto-imports', async () => {
    const code = await transform([
      'useSeoMeta({ title: \'Hello\', description: \'World\'  })',
    ])
    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot(`
      "useHead({
        title: 'Hello',
          { name: 'description', content: 'World' },
        ]
      })"
    `)
  })
})
