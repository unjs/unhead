import type { Expression, ObjectProperty } from 'oxc-parser'
import type { BaseTransformerTypes } from './types'
import { createHash } from 'node:crypto'
import MagicString from 'magic-string'
import { ScopeTracker, ScopeTrackerImport, walk } from 'oxc-walker'
import { createUnplugin } from 'unplugin'
import { isMissingParserError, parseAndWalkSource } from './parser'
import { createJsVueTransformIdFilter, isVueScriptRequest, JS_EXT_RE, splitTransformId } from './utils'

const MIN_INLINE_LENGTH = 4096
const HEAD_FUNCTIONS = new Set(['useHead', 'useServerHead'])
const HEAD_IMPORT_RE = /^(?:unhead|@unhead\/(?:vue|react|solid-js|svelte)|#imports|#app(?:\/composables\/head)?|#unhead\/composables|nuxt\/app)$/
const VARIABLE_CONTENT_RE = /%\w|[\r\0]|<\/(?:script|style)/i

interface StaticInlineKeysOptions extends BaseTransformerTypes {
  framework?: string
}

function propertyName(property: ObjectProperty): string | undefined {
  if (!property.computed && property.kind === 'init') {
    if (property.key.type === 'Identifier')
      return property.key.name
    if (property.key.type === 'Literal' && typeof property.key.value === 'string')
      return property.key.value
  }
}

function staticText(value: Expression): string | undefined {
  if (value.type === 'Literal' && typeof value.value === 'string')
    return value.value
  if (value.type === 'TemplateLiteral' && value.expressions.length === 0)
    return value.quasis[0]?.value.cooked ?? undefined
}

export const StaticInlineKeys = createUnplugin<StaticInlineKeysOptions, false>(options => ({
  name: 'unhead:static-inline-keys',
  enforce: 'post',
  transform: {
    filter: {
      code: /\buse(?:Server)?Head\b/,
      id: createJsVueTransformIdFilter(options.filter?.include),
    },
    handler(code, id) {
      const { pathname, query } = splitTransformId(id)
      const isVueScript = isVueScriptRequest(pathname, query)
      if (code.length < MIN_INLINE_LENGTH || options.filter?.exclude?.some(pattern => id.match(pattern)))
        return
      if (!isVueScript && !JS_EXT_RE.test(pathname) && !options.filter?.include?.some(pattern => id.match(pattern)))
        return

      const scopeTracker = new ScopeTracker({ preserveExitedScopes: true })
      let parsed: ReturnType<typeof parseAndWalkSource>
      try {
        parsed = parseAndWalkSource(code, id, { scopeTracker })
      }
      catch (error) {
        if (isMissingParserError(error))
          throw error
        // Let the bundler report invalid source.
        return
      }
      scopeTracker.freeze()
      const s = new MagicString(code)
      walk(parsed.program, {
        scopeTracker,
        enter(node) {
          if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier')
            return
          const declaration = scopeTracker.getDeclaration(node.callee.name)
          if (declaration instanceof ScopeTrackerImport && declaration.node.type === 'ImportSpecifier') {
            const { imported } = declaration.node
            if (imported.type !== 'Identifier' || !HEAD_FUNCTIONS.has(imported.name) || !HEAD_IMPORT_RE.test(declaration.importNode.source.value))
              return
          }
          else if (declaration || options.framework !== '@unhead/vue' || !isVueScript || !HEAD_FUNCTIONS.has(node.callee.name)) {
            return
          }

          const argument = node.arguments[0]
          const input = argument?.type === 'ArrowFunctionExpression' ? argument.body : argument
          if (input?.type !== 'ObjectExpression')
            return
          for (const property of input.properties) {
            if (property.type !== 'Property')
              continue
            const name = propertyName(property)
            if (name !== 'script' && name !== 'style')
              continue
            const tags = property.value.type === 'ArrayExpression' ? property.value.elements : [property.value]
            for (const tag of tags) {
              // Attributes and author-supplied keys define their own identity.
              if (tag?.type !== 'ObjectExpression' || tag.properties.length !== 1)
                continue
              const [content] = tag.properties
              if (content.type !== 'Property')
                continue
              const field = propertyName(content)
              if (field !== 'innerHTML' && field !== 'textContent')
                continue
              const body = staticText(content.value)
              if (body === undefined || body.length < MIN_INLINE_LENGTH || VARIABLE_CONTENT_RE.test(body))
                continue
              const hash = createHash('sha256').update(name).update('\0').update(body).digest('hex').slice(0, 16)
              s.appendLeft(tag.start + 1, `key:"unhead:inline:${hash}",tagDuplicateStrategy:"replace",`)
            }
          }
        },
      })
      if (s.hasChanged())
        return { code: s.toString(), map: options.sourcemap === false ? null : s.generateMap({ includeContent: true, source: id }) }
    },
  },
}))
