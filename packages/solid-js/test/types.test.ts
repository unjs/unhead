import type { JSX } from 'solid-js'
import type { CreateStreamableServerHeadOptions, ResolvableHead, Unhead, UseHeadInput } from 'unhead/types'
import type { CreateClientHeadOptions } from '../src/client'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { hookImports, useHead, useHeadSafe, useScript, useSeoMeta } from '../src'
import { createHead } from '../src/client'
import { createStreamableHead, HeadStream } from '../src/stream/server'

describe('public types', () => {
  it('preserves entry, renderer, stream, and script generics', () => {
    expectTypeOf(createHead().render).returns.toBeVoid()
    expectTypeOf(createHead({ init: [] }).push).parameter(0).toEqualTypeOf<UseHeadInput>()
    expectTypeOf(createHead({ init: [false, undefined] }).push).parameter(0).toEqualTypeOf<UseHeadInput>()
    expectTypeOf(createHead({ render: head => head.ssr ? 41 as const : 42 as const }).render).returns.toEqualTypeOf<41 | 42>()
    expectTypeOf(HeadStream).returns.toEqualTypeOf<JSX.Element>()

    if (false) {
      interface Input { title: string }
      const exactHead = createHead<Input>()
      expectTypeOf(useHead<Input>({ title: 'page' }, { head: exactHead }).patch).parameter(0).toEqualTypeOf<Input>()
      // @ts-expect-error synthesized safe entries do not provide required title
      useHeadSafe({}, { head: exactHead })
      // @ts-expect-error synthesized SEO entries do not provide required title
      useSeoMeta({}, { head: exactHead })
      // @ts-expect-error synthesized script entries do not provide required title
      useScript('/required.js', { head: exactHead })
      useHead<Input>({ title: 'broad head' }, { head: createHead() })

      type OptionalInput = UseHeadInput & { custom?: string }
      type UnionInput = UseHeadInput | { custom: string }
      const optionalHead = createHead<OptionalInput>()
      const unionHead = createHead<UnionInput>()
      const customOnlyHead = null as unknown as Unhead<{ custom: string }>
      useHeadSafe({}, { head: optionalHead })
      useSeoMeta({}, { head: optionalHead })
      useScript('/optional.js', { head: optionalHead })
      useHeadSafe({}, { head: unionHead })
      useSeoMeta({}, { head: unionHead })
      useScript('/union.js', { head: unionHead })
      // @ts-expect-error standard entries are incompatible with custom-only heads
      useHeadSafe({}, { head: customOnlyHead })
      // @ts-expect-error standard entries are incompatible with custom-only heads
      useSeoMeta({}, { head: customOnlyHead })
      // @ts-expect-error standard entries are incompatible with custom-only heads
      useScript('/custom.js', { head: customOnlyHead })
      expectTypeOf(createStreamableHead<Input>({ disableDefaults: true }).head.push).parameter(0).toEqualTypeOf<Input>()

      const options: CreateClientHeadOptions<Input> = {}
      expectTypeOf(createHead(options).render).returns.toBeVoid()
      const streamOptions: CreateStreamableServerHeadOptions<Input> = {}
      expectTypeOf(createStreamableHead(streamOptions).head.push).parameter(0).toEqualTypeOf<Input | ResolvableHead>()

      const script = useScript<{ lookup: (id: string) => number }>('/script.js')
      expectTypeOf(script.instance).toEqualTypeOf<{ lookup: (id: string) => number } | null>()
      expectTypeOf(script.onLoaded(() => {})).toEqualTypeOf<() => void>()

      // @ts-expect-error explicit entry types require an input
      useHead<Input>()
      // @ts-expect-error unknown root properties remain invalid
      useHead({ notAHeadKey: true })
      // @ts-expect-error exact custom streaming input requires defaults to be disabled
      createStreamableHead<Input>()
    }
  })

  it('exports the installed package name for auto imports', () => {
    expect(hookImports).toHaveProperty('@unhead/solid-js')
  })
})
