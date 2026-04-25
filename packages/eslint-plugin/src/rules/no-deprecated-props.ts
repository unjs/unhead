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
      // Collect existing key names so we can skip the autofix when the
      // target name is already present (otherwise the fix would produce a
      // duplicate-key object literal where the runtime silently picks one).
      const existingKeys = new Set<string>()
      for (const prop of tag.properties) {
        if (prop.type !== 'Property' || prop.computed)
          continue
        const k = prop.key
        const name = k.type === 'Identifier'
          ? k.name
          : k.type === 'Literal' && typeof k.value === 'string'
            ? k.value
            : undefined
        if (name)
          existingKeys.add(name)
      }

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
          const fix = existingKeys.has('tagPosition')
            ? undefined
            : (fixer: Rule.RuleFixer) => fixer.replaceText(prop, `tagPosition: 'bodyClose'`)
          ctx.report({
            node: prop,
            messageId: 'deprecated',
            data: { prop: propName, replacement },
            fix,
          })
          continue
        }

        // children → innerHTML, hid/vmid → key. Replace the key only, leaving the value.
        const newKeyName = propName === 'children' ? 'innerHTML' : 'key'
        const fix = existingKeys.has(newKeyName)
          ? undefined
          : (fixer: Rule.RuleFixer) => fixer.replaceText(key, newKeyName)
        ctx.report({
          node: prop,
          messageId: 'deprecated',
          data: { prop: propName, replacement },
          fix,
        })
      }
    },
  }),
}
