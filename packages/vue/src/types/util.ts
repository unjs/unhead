import type { ComputedRef, Ref } from 'vue'

// copied from @vueuse/shared
export type MaybeReadonlyRef<T> = (() => T) | ComputedRef<T>
export type MaybeComputedRef<T> = T | MaybeReadonlyRef<T> | Ref<T>

export type MaybeComputedRefEntries<T> = MaybeComputedRef<T> | {
  [key in keyof T]?: MaybeComputedRef<T[key]>
}

export type Arrayable<T> = T | Array<T>
