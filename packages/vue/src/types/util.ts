import type { ComputedRef, Ref } from 'vue'

// copied from @vueuse/shared
export type MaybeReadonlyRef<T> = (() => T) | ComputedRef<T>
export type MaybeComputedRef<T> = T | MaybeReadonlyRef<T> | Ref<T>
export type MaybeComputedRefOrPromise<T> = T | MaybeReadonlyRef<T> | Ref<T> | Promise<T>

export type MaybeComputedRefEntries<T> = MaybeComputedRef<T> | {
  [key in keyof T]?: MaybeComputedRefOrPromise<T[key]>
}

export type MaybeComputedRefEntriesOnly<T> = {
  [key in keyof T]?: MaybeComputedRefOrPromise<T[key]>
}
