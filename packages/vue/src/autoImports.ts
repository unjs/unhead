import { composableNames } from 'unhead'

const coreComposableNames = [
  'injectHead',
]

export const unheadVueComposablesImports = {
  '@unhead/vue': [...coreComposableNames, ...composableNames],
}
