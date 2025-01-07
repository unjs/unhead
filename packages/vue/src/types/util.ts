import type { ComputedRef, Ref } from 'vue'

// copied from @vueuse/shared
export type MaybeReadonlyRef<T> = ComputedRef<T>
export type MaybeComputedRef<T> = T | MaybeReadonlyRef<T> | Ref<T>
export type MaybeComputedRefOrFalsy<T> = T | MaybeReadonlyRef<T> | Ref<T>

/**
 * @deprecated Use MaybeComputedRefOrFalsy
 */
export type MaybeComputedRefOrPromise<T> = MaybeComputedRefOrFalsy<T>

export type MaybeComputedRefEntries<T> = MaybeComputedRef<T> | {
  [key in keyof T]?: MaybeComputedRefOrFalsy<T[key]>
}

export type MaybeComputedRefEntriesOnly<T> = {
  [key in keyof T]?: MaybeComputedRefOrFalsy<T[key]>
}
