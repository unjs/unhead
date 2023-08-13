import { composableNames } from '@unhead/shared'

const coreComposableNames = [
  'injectHead',
]

export const unheadVueComposablesImports = {
  '@unhead/vue': [...coreComposableNames, ...composableNames],
}
