export type Booleanable = boolean | 'false' | 'true' | ''
export type Stringable = string | Booleanable | number
export type Arrayable<T> = T | Array<T>

export type Never<T> = {
  [P in keyof T]?: never
}

type Falsy = false | null | undefined

export type ResolvableValue<T> = T | Falsy | (() => (T | Falsy))

type Prettify<T> = { [K in keyof T]: T[K] } & {}
type _ResolvablePropertiesRaw<T> = {
  [K in keyof T as {} extends Pick<T, K> ? never : K]: ResolvableValue<T[K]>
} & {
  [K in keyof T as {} extends Pick<T, K> ? K : never]?: ResolvableValue<T[K]>
}
export type ResolvableProperties<T> = Prettify<_ResolvablePropertiesRaw<T>>

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
