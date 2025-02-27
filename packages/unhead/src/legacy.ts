import type {
  CreateHeadOptions,
  ResolvableHead,
  Unhead,
} from './types'
import { AliasSortingPlugin, DeprecationsPlugin, PromisesPlugin, TemplateParamsPlugin } from './plugins'
import { createUnhead } from './unhead'

export * from './index'

export const activeHead: { value: Unhead<any> | null } = { value: null }

export function getActiveHead() {
  return activeHead?.value
}

export function createServerHead<T extends Record<string, any> = ResolvableHead>(options: CreateHeadOptions = {}) {
  return activeHead.value = createUnhead<T>({
    disableCapoSorting: true,
    ...options,
    // @ts-expect-error untyped
    document: false,
    plugins: [
      ...(options.plugins || []),
      DeprecationsPlugin,
      PromisesPlugin,
      TemplateParamsPlugin,
      AliasSortingPlugin,
    ],
  })
}

export function createHead<T extends Record<string, any> = ResolvableHead>(options: CreateHeadOptions = {}) {
  return activeHead.value = createUnhead<T>({
    disableCapoSorting: true,
    ...options,
    plugins: [
      ...(options.plugins || []),
      DeprecationsPlugin,
      PromisesPlugin,
      TemplateParamsPlugin,
      AliasSortingPlugin,
    ],
  })
}

export const createHeadCore = createUnhead
