import type { RefObject } from 'react'
import type { Falsey } from 'unhead/types'

export type MaybeComputedRef<T> = T | (() => T) | RefObject<T>

export type ResolvableArray<T> = MaybeComputedRef<MaybeComputedRef<T>[]>

export type ResolvableProperties<T> = {
  [key in keyof T]?: MaybeComputedRef<T[key] | Falsey>
}
