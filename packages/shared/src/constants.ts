export const SelfClosingTags = ['meta', 'link', 'base']
export const TagsWithInnerContent = ['title', 'titleTemplate', 'script', 'style', 'noscript']
export const HasElementTags = [
  'base',
  'meta',
  'link',
  'style',
  'script',
  'noscript',
]
export const ValidHeadTags = [
  'title',
  'titleTemplate',
  'templateParams',
  'base',
  'htmlAttrs',
  'bodyAttrs',
  'meta',
  'link',
  'style',
  'script',
  'noscript',
]

export const UniqueTags = ['base', 'title', 'titleTemplate', 'bodyAttrs', 'htmlAttrs', 'templateParams']

export const TagConfigKeys = ['tagPosition', 'tagPriority', 'tagDuplicateStrategy', 'children', 'innerHTML', 'textContent', 'processTemplateParams']

export const IsBrowser = typeof window !== 'undefined'

export const composableNames = [
  'getActiveHead',
  'useHead',
  'useSeoMeta',
  'useHeadSafe',
  'useServerHead',
  'useServerSeoMeta',
  'useServerHeadSafe',
]
