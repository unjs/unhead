const coreComposableNames = [
  'getActiveHead',
]

export const composableNames = [
  'useHead',
  'useTagTitle',
  'useTagBase',
  'useTagMeta',
  'useTagMetaFlat',
  // alias
  'useSeoMeta',
  'useTagLink',
  'useTagScript',
  'useTagStyle',
  'useTagNoscript',
  'useHtmlAttrs',
  'useBodyAttrs',
  'useTitleTemplate',
  // server only composables
  'useServerHead',
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
