import type { CreateStreamableServerHeadOptions, ResolvableHead, Unhead, UseHeadInput } from 'unhead/types'
import type { HeadProps } from '../src'
import type { CreateClientHeadOptions, UnheadProviderProps } from '../src/client'
import type { HelmetProps, HelmetState, HelmetTagProps } from '../src/helmet'
import { describe, expectTypeOf, it } from 'vitest'
import { useHead, useHeadSafe, useScript, useSeoMeta } from '../src'
import { createHead } from '../src/client'
import { createStreamableHead as createStreamableClientHead } from '../src/stream/client'
import { createStreamableHead } from '../src/stream/server'

type IsAny<T> = 0 extends (1 & T) ? true : false

describe('public types', () => {
  it('preserves head entry and renderer generics', () => {
    const defaultHead = createHead()
    expectTypeOf(defaultHead.render).returns.toBeVoid()
    expectTypeOf(createHead({ init: [] }).push).parameter(0).toEqualTypeOf<UseHeadInput>()
    expectTypeOf(createHead({ init: [false, undefined] }).push).parameter(0).toEqualTypeOf<UseHeadInput>()

    const customHead = createHead({ render: head => head.ssr ? 'server' as const : 'rendered' as const })
    expectTypeOf(customHead.render).returns.toEqualTypeOf<'server' | 'rendered'>()

    if (false) {
      interface Input { title: string }
      const exactHead = createHead<Input>()
      const entry = useHead<Input>({ title: 'page' }, { head: exactHead })
      expectTypeOf(entry.patch).parameter(0).toEqualTypeOf<Input>()
      // @ts-expect-error synthesized safe entries do not provide required title
      useHeadSafe({}, { head: exactHead })
      // @ts-expect-error synthesized SEO entries do not provide required title
      useSeoMeta({}, { head: exactHead })
      // @ts-expect-error synthesized script entries do not provide required title
      useScript('/required.js', { head: exactHead })
      useHead<Input>({ title: 'broad head' }, { head: createHead() })
      useHeadSafe({}, { head: createHead() })
      useSeoMeta({}, { head: createHead() })

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

      const options: CreateClientHeadOptions<Input> = {}
      expectTypeOf(createHead(options).render).returns.toBeVoid()
      expectTypeOf(createStreamableClientHead({ init: [] })!.push).parameter(0).toEqualTypeOf<ResolvableHead>()

      const exactStreamHead = createStreamableHead<Input>({ disableDefaults: true })
      expectTypeOf(exactStreamHead.head.push).parameter(0).toEqualTypeOf<Input>()
      const streamOptions: CreateStreamableServerHeadOptions<Input> = {}
      expectTypeOf(createStreamableHead(streamOptions).head.push).parameter(0).toEqualTypeOf<Input | ResolvableHead>()

      // @ts-expect-error an explicit entry type requires a matching input
      useHead<Input>()
      // @ts-expect-error unknown root properties must not bypass head input validation
      useHead({ notAHeadKey: true })
      // @ts-expect-error exact custom streaming input requires defaults to be disabled
      createStreamableHead<Input>()
    }
  })

  it('preserves script API types without exporting any', () => {
    if (false) {
      interface ScriptApi {
        lookup: (id: string) => number
      }

      const script = useScript<ScriptApi>('/script.js')
      useScript('/script.js', { head: createHead() })
      expectTypeOf(script.instance).toEqualTypeOf<ScriptApi | null>()
      expectTypeOf(script.load).returns.toEqualTypeOf<Promise<ScriptApi | false>>()
      expectTypeOf(script.proxy.lookup('id')).toBeVoid()
      expectTypeOf(script.onLoaded(() => {})).toEqualTypeOf<() => void>()
    }

    expectTypeOf<IsAny<ReturnType<typeof useScript>>>().toEqualTypeOf<false>()
  })

  it('exports concrete component, provider, and helmet props', () => {
    expectTypeOf<HeadProps>().toMatchTypeOf<{ children?: unknown }>()
    expectTypeOf<UnheadProviderProps<UseHeadInput>['head']>().toEqualTypeOf<Unhead<UseHeadInput> | undefined>()
    expectTypeOf<HelmetProps['meta']>().toEqualTypeOf<HelmetTagProps[] | undefined>()
    expectTypeOf<Parameters<NonNullable<HelmetProps['onChangeClientState']>>[0]>().toEqualTypeOf<HelmetState>()
    expectTypeOf<IsAny<Parameters<NonNullable<HelmetProps['onChangeClientState']>>[0]>>().toEqualTypeOf<false>()

    const compatibleProps: HelmetProps = {
      htmlAttributes: { customAttribute: 'value' },
      meta: [
        { charSet: 'utf-8' },
        { httpEquiv: 'refresh', content: '30', customAttribute: true },
      ],
    }
    expectTypeOf(compatibleProps).toMatchTypeOf<HelmetProps>()
  })
})
