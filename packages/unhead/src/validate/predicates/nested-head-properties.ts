import type { Diagnostic, TagInput } from './types'

const TOP_LEVEL_HEAD_KEYS = /* @__PURE__ */ new Map([
  ['base', 'base'],
  ['bodyattrs', 'bodyAttrs'],
  ['htmlattrs', 'htmlAttrs'],
  ['link', 'link'],
  ['meta', 'meta'],
  ['noscript', 'noscript'],
  ['script', 'script'],
  ['templateparams', 'templateParams'],
  ['titletemplate', 'titleTemplate'],
])

function quotedList(keys: string[]): string {
  return keys.map(key => `"${key}"`).join(', ')
}

export function nestedHeadProperties(tag: TagInput): Diagnostic[] {
  if (tag.tagType !== 'htmlAttrs' && tag.tagType !== 'bodyAttrs')
    return []

  const nested = [...tag.keys]
    .map(key => ({ input: key, canonical: TOP_LEVEL_HEAD_KEYS.get(key.toLowerCase()) }))
    .filter((key): key is { input: string, canonical: string } => Boolean(key.canonical))
  if (nested.length === 0)
    return []

  const noun = nested.length === 1 ? 'property' : 'properties'
  return [{
    ruleId: 'nested-head-properties',
    message: `${tag.tagType} contains head configuration ${noun} ${quotedList(nested.map(key => key.canonical))}. Move ${nested.length === 1 ? 'it' : 'them'}, and any related title or description, alongside ${tag.tagType} in the head input.`,
    at: { kind: 'prop-key', key: nested[0].input },
  }]
}
