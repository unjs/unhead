import type { ComponentProps, ReactNode } from 'react'
import type { Unhead, UseHeadInput } from 'unhead/types'
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

it('accepts the universal value prop from every provider entry', () => {
  interface UniversalProps {
    children: ReactNode
    value: Unhead
  }

  expectTypeOf<UniversalProps>().toMatchTypeOf<ClientUnheadProviderProps>()
  expectTypeOf<ServerUnheadProviderProps>().toMatchTypeOf<UniversalProps>()
  expectTypeOf<StreamClientUnheadProviderProps>().toMatchTypeOf<UniversalProps>()
  expectTypeOf<StreamServerUnheadProviderProps>().toMatchTypeOf<UniversalProps>()
})

it('keeps legacy client props without allowing conflicting instances', () => {
  interface AutomaticProps {
    children: ReactNode
  }
  interface LegacyProps {
    children: ReactNode
    head: Unhead
  }
  interface ConflictingProps {
    children: ReactNode
    head: Unhead
    value: Unhead
  }

  expectTypeOf<AutomaticProps>().toMatchTypeOf<ClientUnheadProviderProps>()
  expectTypeOf<LegacyProps>().toMatchTypeOf<ClientUnheadProviderProps>()
  expectTypeOf<ConflictingProps>().not.toMatchTypeOf<ClientUnheadProviderProps>()
})
