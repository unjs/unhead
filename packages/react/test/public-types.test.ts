import type { ComponentProps } from 'react'
import type { UseHeadInput } from 'unhead/types'
import type { Head, HeadProps } from '../src'
import type { UnheadProvider as ClientUnheadProvider, UnheadProviderProps as ClientUnheadProviderProps } from '../src/client'
import type { UnheadProvider as ServerUnheadProvider, UnheadProviderProps as ServerUnheadProviderProps } from '../src/server'
import type { UnheadProvider as StreamClientUnheadProvider, UnheadProviderProps as StreamClientUnheadProviderProps } from '../src/stream/client'
import type { UnheadProvider as StreamServerUnheadProvider, UnheadProviderProps as StreamServerUnheadProviderProps } from '../src/stream/server'
import { expectTypeOf, it } from 'vitest'

it('exports the Head component props', () => {
  expectTypeOf<ComponentProps<typeof Head>>().toEqualTypeOf<HeadProps>()
})

it('exports provider props from each React entry', () => {
  expectTypeOf<ComponentProps<typeof ClientUnheadProvider<UseHeadInput, unknown>>>().toEqualTypeOf<ClientUnheadProviderProps>()
  expectTypeOf<ComponentProps<typeof ServerUnheadProvider<UseHeadInput, unknown>>>().toEqualTypeOf<ServerUnheadProviderProps>()
  expectTypeOf<ComponentProps<typeof StreamClientUnheadProvider<UseHeadInput, unknown>>>().toEqualTypeOf<StreamClientUnheadProviderProps>()
  expectTypeOf<ComponentProps<typeof StreamServerUnheadProvider<UseHeadInput, unknown>>>().toEqualTypeOf<StreamServerUnheadProviderProps>()
})
