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

  it('useServerSeoMeta', async () => {
    const code = await transform([
      'useServerSeoMeta({ title: \'Hello\', description: \'World\'  })',
    ])
    expect(code).toBeDefined()
    expect(code).toMatchInlineSnapshot('""')
  })
})
