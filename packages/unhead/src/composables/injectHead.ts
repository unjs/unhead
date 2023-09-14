const _global
  = typeof globalThis !== 'undefined'
    ? globalThis
    : typeof window !== 'undefined'
      ? window
      : typeof global !== 'undefined'
        ? global
        : typeof self !== 'undefined'
          ? self
          : {}

const globalKey = '__unhead_injection_handler__'

export function setHeadInjectionHandler<T>(handler: () => T | undefined) {
  // @ts-expect-error global injection
  _global[globalKey] = handler
}

/* #__PURE__ */ export function injectHead<T>(): T | undefined {
  if (globalKey in _global) {
    // @ts-expect-error global injection
    return _global[globalKey]() as T
  }
}
