import type { Unhead, UseHeadInput } from 'unhead/types'
import type { HeadNode } from './head.component'
import { createHead } from 'unhead/client'
import { describe, expectTypeOf, it } from 'vitest'
import { useHead, useHeadSafe, useScript, useSeoMeta } from './composables'

type IsAny<T> = 0 extends (1 & T) ? true : false

describe('public types', () => {
  it('exposes concrete node and composable types', () => {
    expectTypeOf<HeadNode>().toMatchTypeOf<{ type: string | symbol, children?: readonly unknown[] }>()
    expectTypeOf<IsAny<NonNullable<HeadNode['props']>>>().toEqualTypeOf<false>()

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
      const script = useScript<{ lookup: (id: string) => number }>('/script.js')
      expectTypeOf(script.instance).toEqualTypeOf<{ lookup: (id: string) => number } | null>()
      expectTypeOf(script.onLoaded(() => {})).toEqualTypeOf<() => void>()
    }
  })
})
