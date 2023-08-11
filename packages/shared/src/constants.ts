export const SelfClosingTags = ['meta', 'link', 'base']
export const TagsWithInnerContent = ['title', 'script', 'style', 'noscript']
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

export const TagConfigKeys = ['tagPosition', 'tagPriority', 'tagDuplicateStrategy', 'innerHTML', 'textContent']

export const IsBrowser = typeof window !== 'undefined'
