export const SelfClosingTags = /* @__PURE__ */ new Set(['meta', 'link', 'base'])
export const DupeableTags = /* @__PURE__ */ new Set(['link', 'style', 'script', 'noscript'])
export const TagsWithInnerContent = /* @__PURE__ */ new Set(['title', 'titleTemplate', 'script', 'style', 'noscript'])
export const HasElementTags = /* @__PURE__ */ new Set([
  'base',
  'meta',
  'link',
  'style',
  'script',
  'noscript',
])
export const ValidHeadTags = /* @__PURE__ */ new Set([
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

export const UniqueTags = /* @__PURE__ */ new Set(['base', 'title', 'titleTemplate', 'bodyAttrs', 'htmlAttrs', 'templateParams'])

export const TagConfigKeys = /* @__PURE__ */ new Set(['key', 'tagPosition', 'tagPriority', 'tagDuplicateStrategy', 'innerHTML', 'textContent', 'processTemplateParams'])

export const ScriptNetworkEvents = /* @__PURE__ */ new Set(['onload', 'onerror'])

export const UsesMergeStrategy = /* @__PURE__ */ new Set(['templateParams', 'htmlAttrs', 'bodyAttrs'])

export const MetaTagsArrayable = /* @__PURE__ */ new Set([
  'theme-color',
  'google-site-verification',
  'og',
  'article',
  'book',
  'profile',
  'twitter',
  'author',
])

export const TagPriorityAliases = /* @__PURE__ */ { critical: -8, high: -1, low: 2 } as const
