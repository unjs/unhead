export const SelfClosingTags = new Set(['meta', 'link', 'base'])
export const DupeableTags = new Set(['link', 'style', 'script', 'noscript'])
export const TagsWithInnerContent = new Set(['title', 'titleTemplate', 'script', 'style', 'noscript'])
export const HasElementTags = new Set([
  'base',
  'meta',
  'link',
  'style',
  'script',
  'noscript',
])
export const ValidHeadTags = new Set([
  'title',
  'base',
  'htmlAttrs',
  'bodyAttrs',
  'meta',
  'link',
  'style',
  'script',
  'noscript',
])

export const UniqueTags = new Set(['base', 'title', 'titleTemplate', 'bodyAttrs', 'htmlAttrs', 'templateParams'])

export const TagConfigKeys = new Set(['key', 'tagPosition', 'tagPriority', 'tagDuplicateStrategy', 'innerHTML', 'textContent', 'processTemplateParams'])

export const composableNames = [
  'useHead',
  'useSeoMeta',
  'useHeadSafe',
  'useServerHead',
  'useServerSeoMeta',
  'useServerHeadSafe',
]

export const ScriptNetworkEvents = new Set(['onload', 'onerror'])

export const UsesMergeStrategy = new Set(['templateParams', 'htmlAttrs', 'bodyAttrs'])

export const MetaTagsArrayable = new Set([
  'theme-color',
  'google-site-verification',
  'og',
  'article',
  'book',
  'profile',
  'twitter',
  'author',
])
