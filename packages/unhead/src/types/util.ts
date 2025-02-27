export type Booleanable = boolean | 'false' | 'true' | ''
export type Stringable = string | Booleanable | number
export type Arrayable<T> = T | Array<T>

export type Never<T> = {
  [P in keyof T]?: never
}

type Falsy = false | null | undefined

export type ResolvableValue<T> = T | Falsy | (() => T | Falsy)

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
