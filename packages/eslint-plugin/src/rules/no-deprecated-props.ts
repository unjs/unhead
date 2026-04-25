import type { Rule } from 'eslint'
import { DEPRECATED_PROPS } from 'unhead/validate'
import { createTagVisitor } from '../utils/visitor'

export const noDeprecatedProps: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow deprecated v2 unhead tag props (children, hid/vmid, body).',
      recommended: true,
      url: 'https://unhead.unjs.io/docs/migration/v2-to-v3',
    },
    fixable: 'code',
    schema: [],
    messages: {
      deprecated: '"{{prop}}" was removed in v3 of unhead. Use "{{replacement}}" instead.',
    },
  },
  create: createTagVisitor({
    onTag(tag, _tagType, ctx) {
      for (const prop of tag.properties) {
        if (prop.type !== 'Property' || prop.computed)
          continue
        const key = prop.key
        const propName = key.type === 'Identifier'
          ? key.name
          : key.type === 'Literal' && typeof key.value === 'string'
            ? key.value
            : undefined
        if (!propName || !(propName in DEPRECATED_PROPS))
          continue

        const { replacement } = DEPRECATED_PROPS[propName]

        // body: true → tagPosition: 'bodyClose' (only flag the truthy form)
        if (propName === 'body') {
          if (prop.value.type !== 'Literal' || prop.value.value !== true)
            continue
          ctx.report({
            node: prop,
            messageId: 'deprecated',
            data: { prop: propName, replacement },
            fix: fixer => fixer.replaceText(prop, `tagPosition: 'bodyClose'`),
          })
          continue
        }

        // children → innerHTML, hid/vmid → key. Replace the key only, leaving the value.
        const newKeyName = propName === 'children' ? 'innerHTML' : 'key'
        ctx.report({
          node: prop,
          messageId: 'deprecated',
          data: { prop: propName, replacement },
          fix: fixer => fixer.replaceText(key, newKeyName),
        })
      }
    },
  }),
}
