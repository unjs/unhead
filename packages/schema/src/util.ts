export type Never<T> = {
  [P in keyof T]?: never
}

export type MaybeFunction<T> = T | (() => T)

export type Falsey = false | null | undefined

export type ResolvableValues<T> = {
  [key in keyof T]?: MaybeFunction<T[key] | Falsey>
}
