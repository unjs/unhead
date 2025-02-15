import type { Falsey } from 'unhead/types'
import type { ComputedRef, Ref } from 'vue'

export type MaybeFalsey<T> = T | Falsey

export type ResolvableValue<T> = MaybeFalsey<T> | (() => MaybeFalsey<T>) | ComputedRef<MaybeFalsey<T>> | Ref<MaybeFalsey<T>>

export type ResolvableArray<T> = ResolvableValue<ResolvableValue<T>[]>

export type ResolvableProperties<T> = {
  [key in keyof T]?: ResolvableValue<T[key]>
}
