import type { Falsey } from 'unhead/types'
import type { ComputedRef, Ref } from 'vue'

export type MaybeComputedRef<T> = T | (() => T) | ComputedRef<T> | Ref<T>

export type ResolvableArray<T> = MaybeComputedRef<MaybeComputedRef<T>[]>

export type ResolvableProperties<T> = {
  [key in keyof T]?: MaybeComputedRef<T[key] | Falsey>
}
