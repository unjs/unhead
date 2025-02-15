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

export type Falsey = false | null | undefined

export type ResolvableValue<T> = T | Falsey | (() => T | Falsey)

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
