import { describe, expect, it } from 'vitest'
import { parse } from 'acorn'

import { TreeshakeServerComposables } from '../../packages/addons/src/unplugin/TreeshakeServerComposables'

const transform = async (code: string | string[], id = 'some-id.js') => {
  const plugin = TreeshakeServerComposables.vite() as any
  const res = await plugin.transform.call(
    { parse: (code: string) => parse(code, { ecmaVersion: 2022, sourceType: 'module' }) },
    Array.isArray(code) ? code.join('\n') : code,
    id,
  )
  return res?.code
}

describe('TreeshakeServerComposables', () => {
  const couldTransform = [
    'import { useServerHead } from \'unhead\'',
    'useServerHead({ title: \'Hello\', description: \'World\' })',
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
        'import { useServerHead } from \'unhead\'',
        'const meta = {}',
        'console.log(useServerHead(meta))',
      ]),
    ).toMatchInlineSnapshot()
  })

  it('statically replaces regexps where possible', async () => {
    const code = await transform([
      'import { something } from \'other-module\'',
      'import { useServerSeoMeta } from \'unhead\'',
      'useServerSeoMeta({ title: \'Hello\', description: \'World\'  })',
      'useServerSeoMeta({ title: \'Hello 2\', description: \'World 2\'  })',
    ])
    expect(code).toMatchInlineSnapshot(`
      "import { something } from 'other-module'
      import { useServerSeoMeta } from 'unhead'

      "
    `)
  })

  it('respects how users import library', async () => {
    const code = await transform([
      'import { useServerHead as usm } from \'unhead\'',
      'usm({ title: \'Hello\', description: \'World\'  })',
    ])
    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot(`
      "import { useSeoMeta as usm } from 'unhead'
      useHead({\\"title\\":\\"Hello\\",\\"meta\\":[{\\"name\\":\\"description\\",\\"content\\":\\"World\\"}]})"
    `)
  })

  it('respects auto-imports', async () => {
    const code = await transform([
      'useSeoMeta({ title: \'Hello\', description: \'World\'  })',
    ])
    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot('"useHead({\\"title\\":\\"Hello\\",\\"meta\\":[{\\"name\\":\\"description\\",\\"content\\":\\"World\\"}]})"')
  })

  it('useServerSeoMeta', async () => {
    const code = await transform([
      'useServerSeoMeta({ title: \'Hello\', description: \'World\'  })',
    ])
    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot(`
      "useServerHead({\\"meta\\":[{\\"name\\":\\"meta\\",\\"content\\":\\"name=description, content=World\\"}]})
      useHead({\\"title\\":\\"Hello\\"})"
    `)
  })
})
