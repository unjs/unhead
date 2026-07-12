import { expectTypeOf, it } from 'vitest'
import plugin, { rules } from '../src'

it('preserves the rule map on the default export', () => {
  expectTypeOf(plugin.rules).toEqualTypeOf<typeof rules>()
  expectTypeOf(plugin.rules['no-unknown-meta']).toEqualTypeOf(rules['no-unknown-meta'])
})
