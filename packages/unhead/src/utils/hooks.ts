import type { HookableCore } from 'hookable'
import type { CoreHeadHooks } from '../types'
import { HookableCore as Hookable } from 'hookable'

export function createHooks<T extends CoreHeadHooks>(hooks?: Partial<T>): HookableCore<T> {
  const instance = new Hookable<T>()
  for (const key in hooks || {}) {
    instance.hook(key as any, hooks![key as keyof typeof hooks] as any)
  }
  return instance
}
