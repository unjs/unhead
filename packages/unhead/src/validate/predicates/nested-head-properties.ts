import type { Diagnostic, InputValueKind, TagInput } from './types'

interface HeadInputFieldShape {
  canonical: string
  kinds: readonly InputValueKind[]
  distinguishesFromAttrs: boolean
}

// `title` can corroborate a match but cannot establish one because it is also
// a global attribute. `style` is omitted because its head and attribute value
// shapes overlap completely.
const HEAD_INPUT_SHAPE: Record<string, HeadInputFieldShape> = {
  base: {
    canonical: 'base',
    kinds: ['object'],
    distinguishesFromAttrs: true,
  },
  bodyattrs: {
    canonical: 'bodyAttrs',
    kinds: ['object'],
    distinguishesFromAttrs: true,
  },
  htmlattrs: {
    canonical: 'htmlAttrs',
    kinds: ['object'],
    distinguishesFromAttrs: true,
  },
  link: {
    canonical: 'link',
    kinds: ['array'],
    distinguishesFromAttrs: true,
  },
  meta: {
    canonical: 'meta',
    kinds: ['array'],
    distinguishesFromAttrs: true,
  },
  noscript: {
    canonical: 'noscript',
    kinds: ['array'],
    distinguishesFromAttrs: true,
  },
  script: {
    canonical: 'script',
    kinds: ['array'],
    distinguishesFromAttrs: true,
  },
  templateparams: {
    canonical: 'templateParams',
    kinds: ['object'],
    distinguishesFromAttrs: true,
  },
  title: {
    canonical: 'title',
    kinds: ['function', 'number', 'object', 'string'],
    distinguishesFromAttrs: false,
  },
  titletemplate: {
    canonical: 'titleTemplate',
    kinds: ['function', 'object', 'string'],
    distinguishesFromAttrs: true,
  },
}

type HeadInputShapeMatch
  = | { _tag: 'HeadInput', fields: HeadInputFieldShape[] }
    | { _tag: 'NotHeadInput' }

function quotedList(keys: string[]): string {
  return keys.map(key => `"${key}"`).join(', ')
}

function matchHeadInputShape(tag: TagInput): HeadInputShapeMatch {
  const fields: HeadInputFieldShape[] = []

  for (const input of tag.keys) {
    const shape = HEAD_INPUT_SHAPE[input.toLowerCase()]
    if (!shape)
      continue
    const valueKind = tag.valueKinds.get(input) ?? 'unknown'
    if (!shape.kinds.includes(valueKind))
      continue
    fields.push(shape)
  }

  const hasDefiniteHeadField = fields.some(field => field.distinguishesFromAttrs)
  if (!hasDefiniteHeadField)
    return { _tag: 'NotHeadInput' }

  return { _tag: 'HeadInput', fields }
}

export function nestedHeadProperties(tag: TagInput): Diagnostic[] {
  if (tag.tagType !== 'htmlAttrs' && tag.tagType !== 'bodyAttrs')
    return []

  const match = matchHeadInputShape(tag)
  if (match._tag === 'NotHeadInput')
    return []

  return [{
    ruleId: 'nested-head-properties',
    message: `${tag.tagType} looks like a nested head input because it contains ${quotedList(match.fields.map(field => field.canonical))}. Move those head properties alongside ${tag.tagType}.`,
    at: { kind: 'tag' },
  }]
}
