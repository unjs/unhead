// Create a thenable that React's use() can read synchronously without suspending
export function resolvedThenable<T>(value: T): Promise<T> {
  return {
    status: 'fulfilled',
    value,
    then(onFulfill: (v: T) => any) {
      const result = onFulfill(value)
      return result && typeof result.then === 'function' ? result : resolvedThenable(result)
    },
  } as unknown as Promise<T>
}

// Create a delayed promise for server-side streaming simulation
export function delayedPromise<T>(value: T, delay: number): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), delay))
}

// Cache factory that handles SSR hydration correctly
export function createSSRCache<T>() {
  const cache = new Map<string, Promise<T>>()

  return {
    get(key: string, value: T, serverDelay: number): Promise<T> {
      if (!cache.has(key)) {
        cache.set(
          key,
          typeof window === 'undefined'
            ? delayedPromise(value, serverDelay)
            : resolvedThenable(value), // Sync on client - no suspend
        )
      }
      return cache.get(key)!
    },
  }
}
