import type { ResolverOptions } from '../src'
import { expectTypeOf, it } from 'vitest'

it('exports schema resolver options from the package entry', () => {
  expectTypeOf<ResolverOptions>().toHaveProperty('array')
  expectTypeOf<ResolverOptions>().toHaveProperty('root')
  expectTypeOf<ResolverOptions>().toHaveProperty('generateId')
  expectTypeOf<ResolverOptions>().toHaveProperty('afterResolve')
})
