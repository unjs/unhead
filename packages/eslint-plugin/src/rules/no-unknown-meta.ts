import type { Rule } from 'eslint'
import {
  findClosestMatch,
  KNOWN_META_NAMES,
  KNOWN_META_PROPERTIES,
} from 'unhead/validate'
import { createTagVisitor, findProperty, getStringValue } from '../utils/visitor'

const OG_PREFIX_RE = /^(?:og|article|book|profile|fb):/

export const noUnknownMeta: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Detect typos in meta `name` and `property` values.',
      recommended: true,
      url: 'https://unhead.unjs.io/docs/typescript/head/api/composables/use-seo-meta',
    },
    fixable: 'code',
    schema: [],
    messages: {
      unknownProperty: 'Unknown meta property "{{value}}". Did you mean "{{suggestion}}"?',
      unknownName: 'Unknown meta name "{{value}}". Did you mean "{{suggestion}}"?',
    },
  },
  create: createTagVisitor({
    onTag(tag, tagType, ctx) {
      if (tagType !== 'meta')
        return

      const propertyProp = findProperty(tag, 'property')
      const nameProp = findProperty(tag, 'name')

      if (propertyProp) {
        const value = getStringValue(propertyProp.value)
        if (value && !KNOWN_META_PROPERTIES.has(value) && OG_PREFIX_RE.test(value)) {
          const suggestion = findClosestMatch(value, KNOWN_META_PROPERTIES)
          if (suggestion) {
            ctx.report({
              node: propertyProp.value,
              messageId: 'unknownProperty',
              data: { value, suggestion },
              fix: fixer => fixer.replaceText(propertyProp.value, `'${suggestion}'`),
            })
          }
        }
      }

      if (nameProp) {
        const value = getStringValue(nameProp.value)
        // HTML `meta[name]` is case-insensitive, so normalize before lookup.
        const lower = value?.toLowerCase()
        if (
          value
          && lower
          && !KNOWN_META_NAMES.has(lower)
          && (lower.startsWith('twitter:') || lower.startsWith('fediverse:') || !lower.includes(':'))
        ) {
          const suggestion = findClosestMatch(lower, KNOWN_META_NAMES)
          if (suggestion) {
            ctx.report({
              node: nameProp.value,
              messageId: 'unknownName',
              data: { value, suggestion },
              fix: fixer => fixer.replaceText(nameProp.value, `'${suggestion}'`),
            })
          }
        }
      }
    },
  }),
}
