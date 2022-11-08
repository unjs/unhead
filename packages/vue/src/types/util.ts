import type { MaybeComputedRef } from '@vueuse/shared'

export type MaybeComputedRefEntries<T> = MaybeComputedRef<T> | {
  [key in keyof T]?: MaybeComputedRef<T[key]>
}

export type Arrayable<T> = T | Array<T>
