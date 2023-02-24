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
  // deprecated
  'useTagTitle',
  'useTagBase',
  'useTagMeta',
  'useTagMetaFlat',
  'useTagLink',
  'useTagScript',
  'useTagStyle',
  'useTagNoscript',
  'useHtmlAttrs',
  'useBodyAttrs',
  'useTitleTemplate',
  'useServerTagTitle',
  'useServerTagBase',
  'useServerTagMeta',
  'useServerTagMetaFlat',
  'useServerTagLink',
  'useServerTagScript',
  'useServerTagStyle',
  'useServerTagNoscript',
  'useServerHtmlAttrs',
  'useServerBodyAttrs',
  'useServerTitleTemplate',
]

export const unheadComposablesImports = [
  {
    from: 'unhead',
    imports: [...coreComposableNames, ...composableNames],
  },
]
