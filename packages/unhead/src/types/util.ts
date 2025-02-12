export type Booleanable = boolean | 'false' | 'true' | ''
export type Stringable = string | Booleanable | number
export type Arrayable<T> = T | Array<T>

export type DefinedValueOrEmptyObject<T extends undefined | Record<string, any>> = [T] extends [undefined] ? (Record<string, any>) : T
export type Merge<T extends undefined | Record<string, any>, D = Record<string, any>> = [T] extends [undefined] ? D : D & T

export interface MergeHead {
  base?: Record<string, any>
  link?: Record<string, any>
  meta?: Record<string, any>
  style?: Record<string, any>
  script?: Record<string, any>
  noscript?: Record<string, any>
  htmlAttrs?: Record<string, any>
  bodyAttrs?: Record<string, any>
}

export type Never<T> = {
  [P in keyof T]?: never
}

export type MaybeFunction<T> = T | (() => T)

export type Falsey = false | null | undefined

export type ResolvableValues<T> = {
  [key in keyof T]?: MaybeFunction<T[key] | Falsey>
}
