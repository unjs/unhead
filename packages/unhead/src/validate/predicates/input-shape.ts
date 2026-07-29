import type { Diagnostic, InputShapeContext, InputShapeView, InputValueKind } from './types'

interface InputFieldShape {
  canonical: string
  contexts: Partial<Record<InputShapeContext, readonly InputValueKind[]>>
}

const RESOLVABLE_OBJECT = ['boolean', 'function', 'null', 'object'] as const
const RESOLVABLE_TAG_LIST = ['array', 'boolean', 'function', 'null'] as const
const RESOLVABLE_TITLE = ['boolean', 'function', 'null', 'number', 'object', 'string'] as const
const ATTRIBUTE_SCALAR = ['boolean', 'function', 'null', 'number', 'string'] as const
const ATTRIBUTE_STRUCTURED = ['array', 'boolean', 'function', 'null', 'number', 'object', 'string'] as const

/**
 * Canonical structural contract for known head fields. Unknown head fields
 * remain valid so module augmentations do not require validator changes.
 */
export const INPUT_SHAPE_FIELDS: Record<string, InputFieldShape> = {
  base: {
    canonical: 'base',
    contexts: { head: RESOLVABLE_OBJECT },
  },
  bodyattrs: {
    canonical: 'bodyAttrs',
    contexts: { head: RESOLVABLE_OBJECT },
  },
  class: {
    canonical: 'class',
    contexts: {
      bodyAttrs: ATTRIBUTE_STRUCTURED,
      htmlAttrs: ATTRIBUTE_STRUCTURED,
    },
  },
  htmlattrs: {
    canonical: 'htmlAttrs',
    contexts: { head: RESOLVABLE_OBJECT },
  },
  link: {
    canonical: 'link',
    contexts: { head: RESOLVABLE_TAG_LIST },
  },
  meta: {
    canonical: 'meta',
    contexts: { head: RESOLVABLE_TAG_LIST },
  },
  noscript: {
    canonical: 'noscript',
    contexts: { head: RESOLVABLE_TAG_LIST },
  },
  script: {
    canonical: 'script',
    contexts: { head: RESOLVABLE_TAG_LIST },
  },
  style: {
    canonical: 'style',
    contexts: {
      bodyAttrs: ATTRIBUTE_STRUCTURED,
      head: RESOLVABLE_TAG_LIST,
      htmlAttrs: ATTRIBUTE_STRUCTURED,
    },
  },
  templateparams: {
    canonical: 'templateParams',
    contexts: { head: ['object'] },
  },
  title: {
    canonical: 'title',
    contexts: {
      bodyAttrs: ATTRIBUTE_SCALAR,
      head: RESOLVABLE_TITLE,
      htmlAttrs: ATTRIBUTE_SCALAR,
      seoMeta: RESOLVABLE_TITLE,
    },
  },
  titletemplate: {
    canonical: 'titleTemplate',
    contexts: {
      head: ['function', 'null', 'object', 'string'],
      seoMeta: ['function', 'null', 'object', 'string'],
    },
  },
}

function includes(kinds: readonly InputValueKind[] | undefined, kind: InputValueKind): boolean {
  return kinds?.includes(kind) === true
}

function formatKinds(kinds: readonly InputValueKind[]): string {
  return kinds.join(', ')
}

function invalidKnownHeadField(
  input: InputShapeView,
  key: string,
  shape: InputFieldShape,
  kind: InputValueKind,
): Diagnostic | undefined {
  const expected = shape.contexts[input.context]
  if (includes(expected, kind))
    return undefined
  if ((input.context === 'htmlAttrs' || input.context === 'bodyAttrs') && kind === 'null')
    return undefined

  if (input.context === 'head') {
    return {
      ruleId: 'invalid-input-shape',
      message: `"${shape.canonical}" in a head input must be one of: ${formatKinds(expected || [])}. Received ${kind}.`,
      at: { kind: 'prop-value', key },
    }
  }

  if (includes(shape.contexts.head, kind)) {
    return {
      ruleId: 'invalid-input-shape',
      message: `"${shape.canonical}" has a head input shape but appears in ${input.context}. Move it to the top-level head input.`,
      at: { kind: 'prop-value', key },
    }
  }
}

function invalidAttributeField(
  input: InputShapeView,
  key: string,
  kind: InputValueKind,
): Diagnostic | undefined {
  if (includes(ATTRIBUTE_SCALAR, kind))
    return undefined
  return {
    ruleId: 'invalid-input-shape',
    message: `"${key}" in ${input.context} must resolve to a scalar attribute value. Received ${kind}.`,
    at: { kind: 'prop-value', key },
  }
}

/**
 * Validate statically-known value shapes against their input context.
 */
export function validateInputShape(input: InputShapeView): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  const isAttributes = input.context === 'htmlAttrs' || input.context === 'bodyAttrs'

  for (const key of input.keys) {
    const kind = input.valueKinds.get(key) ?? 'unknown'
    if (kind === 'unknown')
      continue

    const shape = INPUT_SHAPE_FIELDS[key.toLowerCase()]
    const knownDiagnostic = shape
      ? invalidKnownHeadField(input, key, shape, kind)
      : undefined
    if (knownDiagnostic) {
      diagnostics.push(knownDiagnostic)
      continue
    }

    if (isAttributes && !shape?.contexts[input.context]) {
      const attributeDiagnostic = invalidAttributeField(input, key, kind)
      if (attributeDiagnostic)
        diagnostics.push(attributeDiagnostic)
    }
  }

  return diagnostics
}
