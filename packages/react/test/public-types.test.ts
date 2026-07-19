import type { ComponentProps } from 'react'
import type { Head, HeadProps } from '../src'
import { expectTypeOf, it } from 'vitest'

it('exports the Head component props', () => {
  expectTypeOf<ComponentProps<typeof Head>>().toEqualTypeOf<HeadProps>()
})
