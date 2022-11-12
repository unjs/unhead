import { composableNames } from 'unhead'

const coreComposableNames = [
  'injectHead',
]

export const unheadVueComposablesImports = [
  {
    from: '@unhead/vue',
    imports: [...coreComposableNames, ...composableNames],
  },
]
