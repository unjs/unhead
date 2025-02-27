import type { ComputedRef, Ref } from 'vue'

type Falsy = false | null | undefined
export type MaybeFalsy<T> = T | Falsy

export type ResolvableValue<T> = MaybeFalsy<T> | (() => MaybeFalsy<T>) | ComputedRef<MaybeFalsy<T>> | Ref<MaybeFalsy<T>>

export type ResolvableArray<T> = ResolvableValue<ResolvableValue<T>[]>

export type ResolvableProperties<T> = {
  [key in keyof T]?: ResolvableValue<T[key]>
}
