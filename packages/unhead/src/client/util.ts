export function createDebouncedFn(callee: () => void, delayer: (fn: () => void) => void) {
  let ctxId = 0

  return () => {
    const delayFnCtxId = ++ctxId

    delayer(() => {
      if (ctxId === delayFnCtxId) {
        callee()
      }
    })
  }
}
