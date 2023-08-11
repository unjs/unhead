const coreComposableNames = [
  'getActiveHead',
]

export const composableNames = [
  'useHead',
  'useSeoMeta',
  'useHeadSafe',
  'useServerHead',
  'useServerSeoMeta',
  'useServerHeadSafe',
]

export const unheadComposablesImports = [
  {
    from: 'unhead',
    imports: [...coreComposableNames, ...composableNames],
  },
]
