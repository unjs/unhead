import { composableNames } from '@unhead/shared'

const coreComposableNames = [
  'injectHead',
]

export const unheadVueComposablesImports = {
  '@unhead/vue': [].concat(coreComposableNames, composableNames),
}
