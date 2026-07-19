import type { HeadTag } from '../types'

const DEFAULT_HTML_ATTRS = { lang: 'en' }
const DEFAULT_CHARSET = { charset: 'utf-8' }
const DEFAULT_VIEWPORT = { name: 'viewport', content: 'width=device-width, initial-scale=1' }

/** Package defaults before normalization. @internal */
export const DEFAULT_INIT = { htmlAttrs: DEFAULT_HTML_ATTRS, meta: [DEFAULT_CHARSET, DEFAULT_VIEWPORT] }

/** Package defaults after normalization. @internal */
export const DEFAULT_INIT_TAGS: HeadTag[] = [
  { tag: 'htmlAttrs', props: DEFAULT_HTML_ATTRS, _w: 100, _p: 1024, _d: 'htmlAttrs' },
  { tag: 'meta', props: DEFAULT_CHARSET, _w: -20, _p: 1025, _d: 'charset' },
  { tag: 'meta', props: DEFAULT_VIEWPORT, _w: -15, _p: 1026, _d: 'meta:viewport' },
]

/** Package defaults after static serialization. @internal */
export const DEFAULT_STATIC_PLAN = [
  [-20, 'charset', '<meta charset="utf-8">'],
  [-15, 'meta:viewport', '<meta name="viewport" content="width=device-width, initial-scale=1">'],
  [100, 'htmlAttrs:lang', ' lang="en"', 3],
] as const
