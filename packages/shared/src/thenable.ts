export type Thenable<T> = Promise<T> | T

export function thenable<T, R>(val: T, thenFn: (val: Awaited<T>) => R): Promise<R> | R {
  if (val instanceof Promise) {
    return val.then(thenFn)
  }

  return thenFn(val as Awaited<T>)
}
