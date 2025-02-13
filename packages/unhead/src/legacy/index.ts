import type {
  CreateHeadOptions,
  Head,
  Unhead,
} from '../types'
import { createHeadCore } from '../createHead'
import { DeprecationsPlugin } from '../plugins/deprecations'
import { PromisesPlugin } from '../plugins/promises'
import { composableNames } from '../utils/const'

export * from '../index'
export * from './useScript'

export const activeHead: { value: Unhead<any> | null } = { value: null }

export function getActiveHead() {
  return activeHead?.value
}

export const unheadComposablesImports = [
  {
    from: 'unhead',
    imports: composableNames,
  },
]

export { composableNames }

export function createServerHead<T extends Record<string, any> = Head>(options: CreateHeadOptions = {}) {
  return activeHead.value = createHeadCore<T>({
    disableCapoSorting: true,
    ...options,
    // @ts-expect-error untyped
    document: false,
    plugins: [
      ...(options.plugins || []),
      DeprecationsPlugin,
      PromisesPlugin,
    ],
  })
}

export function createHead<T extends Record<string, any> = Head>(options: CreateHeadOptions = {}) {
  return activeHead.value = createHeadCore<T>({
    disableCapoSorting: true,
    ...options,
    plugins: [
      ...(options.plugins || []),
      DeprecationsPlugin,
      PromisesPlugin,
    ],
  })
}

export { createHeadCore }
