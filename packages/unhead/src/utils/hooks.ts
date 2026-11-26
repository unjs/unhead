import type { CoreHeadHooks, HeadHookable, HeadHookCallback } from '../types'

function runHooks(hooks: HeadHookCallback[], args: unknown[], start: number): Promise<void> | void {
  for (let i = start; i < hooks.length; i++) {
    try {
      const result = hooks[i](...args)
      if (result && typeof (result as PromiseLike<void>).then === 'function')
        return Promise.resolve(result).then(() => runHooks(hooks, args, i + 1))
    }
    catch (error) {
      return Promise.reject(error)
    }
  }
}

export function createHooks<T extends CoreHeadHooks>(
  hooks?: Partial<T>,
  storage?: Record<string, HeadHookCallback[] | undefined>,
): HeadHookable<T> {
  const _hooks: Record<string, HeadHookCallback[] | undefined> = storage || Object.create(null)
  const removeHook = (name: string, fn: HeadHookCallback) => {
    const list = _hooks[name]
    if (list) {
      const i = list.indexOf(fn)
      if (i !== -1)
        list.splice(i, 1)
      if (!list.length)
        _hooks[name] = undefined
    }
  }
  const instance: HeadHookable<T> & { _hooks: Record<string, HeadHookCallback[] | undefined> } = {
    _hooks,
    hook(name, fn) {
      if (!name || typeof fn !== 'function')
        return () => {}
      const list = (_hooks[name] ||= [])
      list.push(fn)
      let active: HeadHookCallback | undefined = fn
      return () => {
        if (active) {
          removeHook(name, active)
          active = undefined
        }
      }
    },
    removeHook: removeHook as HeadHookable<T>['removeHook'],
    callHook(name, ...args) {
      const list = _hooks[name]
      if (list?.length)
        return runHooks(list, args, 0)
    },
  }
  for (const key in hooks || {})
    instance.hook(key as any, hooks![key as keyof typeof hooks] as any)
  return instance
}
