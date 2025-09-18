// Tag constants for performance optimization
export const TAG_HTML = 0
export const TAG_HEAD = 1
export const TAG_TITLE = 4
export const TAG_META = 5
export const TAG_BODY = 44
export const TAG_SCRIPT = 52
export const TAG_STYLE = 53
export const TAG_LINK = 54
export const TAG_BASE = 56

// Map string tag names to numeric constants
export const TagIdMap = {
  html: TAG_HTML,
  head: TAG_HEAD,
  title: TAG_TITLE,
  meta: TAG_META,
  body: TAG_BODY,
  script: TAG_SCRIPT,
  style: TAG_STYLE,
  link: TAG_LINK,
  base: TAG_BASE,
} as const
