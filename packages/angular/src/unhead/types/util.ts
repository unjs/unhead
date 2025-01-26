import type { Signal, WritableSignal } from '@angular/core'
import type { Falsey } from '@unhead/schema'

export type MaybeSignal<T> = T | (() => T) | Signal<T> | WritableSignal<T>

export type ResolvableArray<T> = MaybeSignal<MaybeSignal<T>[]>

export type ResolvableProperties<T> = {
  [key in keyof T]?: MaybeSignal<T[key] | Falsey>
}
