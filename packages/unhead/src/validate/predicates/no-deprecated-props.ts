import type { Diagnostic, TagPredicate } from './types'
import { DEPRECATED_PROPS } from '../known'

export const noDeprecatedProps: TagPredicate = (tag) => {
  const out: Diagnostic[] = []
  for (const key of tag.keys) {
    if (!(key in DEPRECATED_PROPS))
      continue
    const { replacement } = DEPRECATED_PROPS[key]

    // body: true → tagPosition: 'bodyClose'. Only flag the truthy form.
    if (key === 'body') {
      if (tag.props.body !== true)
        continue
      const fix = tag.keys.has('tagPosition')
        ? undefined
        : { type: 'replace-prop' as const, key: 'body', newSource: `tagPosition: 'bodyClose'` }
      out.push({
        ruleId: 'deprecated-prop-body',
        message: `"body" was removed in v3 of unhead. Use "${replacement}" instead.`,
        at: { kind: 'prop', key },
        fix,
      })
      continue
    }

    const newKey = key === 'children' ? 'innerHTML' : 'key'
    const fix = tag.keys.has(newKey)
      ? undefined
      : { type: 'rename-prop' as const, key, newKey }
    out.push({
      ruleId: key === 'children' ? 'deprecated-prop-children' : 'deprecated-prop-hid-vmid',
      message: `"${key}" was removed in v3 of unhead. Use "${replacement}" instead.`,
      at: { kind: 'prop', key },
      fix,
    })
  }
  return out
}
