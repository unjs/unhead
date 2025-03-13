import type { ComputedRef, Ref } from 'vue'

type Falsy = false | null | undefined
export type MaybeFalsy<T> = T | Falsy

export type ResolvableValue<T> = MaybeFalsy<T> | (() => MaybeFalsy<T>) | ComputedRef<MaybeFalsy<T>> | Ref<MaybeFalsy<T>>

export type ResolvableArray<T> = ResolvableValue<ResolvableValue<T>[]>

export type ResolvableProperties<T> = {
  [key in keyof T]?: ResolvableValue<T[key]>
}

export type ResolvableUnion<T> = T extends string | number | boolean
  ? ResolvableValue<T>
  : T extends object
    ? DeepResolvableProperties<T>
    : ResolvableValue<T>

export type DeepResolvableProperties<T> = {
  [K in keyof T]?: T[K] extends string | object
    ? T[K] extends string
      ? ResolvableUnion<T[K]>
      : T[K] extends object
        ? DeepResolvableProperties<T[K]>
        : ResolvableUnion<T[K]>
    : ResolvableUnion<T[K]>
}
