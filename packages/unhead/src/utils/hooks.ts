import type { CoreHeadHooks, HeadHookable, HeadHookCallback } from '../types'

function runHooks(hooks: HeadHookCallback[], args: unknown[], i: number): Promise<void> | void {
  for (; i < hooks.length; i++) {
    try {
      const r = hooks[i](...args)
      if (r && typeof (r as PromiseLike<void>).then === 'function')
        return Promise.resolve(r).then(() => runHooks(hooks, args, i + 1))
    }
    catch (e) {
      return Promise.reject(e)
    }
  }
}

export function createHooks<T extends CoreHeadHooks>(
  hooks?: Partial<T>,
  _hooks: Record<string, HeadHookCallback[] | undefined> = Object.create(null),
): HeadHookable<T> {
  const removeHook = (name: string, fn: HeadHookCallback) => {
    const list = _hooks[name]
    const i = list ? list.indexOf(fn) : -1
    if (i !== -1) {
      list!.splice(i, 1)
      if (!list!.length)
        _hooks[name] = undefined
    }
  }
  const hook = (name: string, fn: HeadHookCallback) => {
    if (!name || typeof fn !== 'function')
      return () => {}
    const list = _hooks[name] ||= []
    list.push(fn)
    let cb: HeadHookCallback | undefined = fn
    return () => {
      if (cb) {
        removeHook(name, cb)
        cb = undefined
      }
    }
  }
  for (const key in hooks)
    hook(key, hooks[key] as any)
  return {
    _hooks,
    hook,
    removeHook,
    callHook: (name: string, ...args: unknown[]) => _hooks[name]?.length ? runHooks(_hooks[name]!, args, 0) : undefined,
  } as HeadHookable<T>
}
