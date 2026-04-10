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
  // eslint-disable-next-line ts/no-empty-object-type
  [K in keyof T as {} extends Pick<T, K> ? never : K]: ResolvableValue<T[K]>
} & {
  // eslint-disable-next-line ts/no-empty-object-type
  [K in keyof T as {} extends Pick<T, K> ? K : never]?: ResolvableValue<T[K]>
}
export type ResolvableProperties<T> = Prettify<_ResolvablePropertiesRaw<T>>

export type ResolvableUnion<T> = T extends string | number | boolean
  ? ResolvableValue<T>
  : T extends object
    ? DeepResolvableProperties<T>
    : ResolvableValue<T>

/**
 * Recursively marks all properties and arrays as readonly.
 * Applied to `InferScript`/`InferLink` return types so that
 * `defineScript`/`defineLink` accept both mutable and `as const` inputs.
 */
export type DeepReadonly<T> = T extends (...a: any[]) => any
  ? T
  : T extends ReadonlyArray<infer U>
    ? readonly DeepReadonly<U>[]
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T

export type DeepResolvableProperties<T> = {
  [K in keyof T]?: T[K] extends string | object
    ? T[K] extends string
      ? ResolvableUnion<T[K]>
      : T[K] extends object
        ? DeepResolvableProperties<T[K]>
        : ResolvableUnion<T[K]>
    : ResolvableUnion<T[K]>
}
