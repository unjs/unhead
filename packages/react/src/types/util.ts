import type { Falsey } from '@unhead/schema'
import type { RefObject } from 'react'

export type MaybeComputedRef<T> = T | (() => T) | RefObject<T>

export type ResolvableArray<T> = MaybeComputedRef<MaybeComputedRef<T>[]>

export type ResolvableProperties<T> = {
  [key in keyof T]?: MaybeComputedRef<T[key] | Falsey>
}
