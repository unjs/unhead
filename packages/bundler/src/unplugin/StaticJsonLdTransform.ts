import type { Expression, ObjectExpression, ObjectProperty } from 'oxc-parser'
import type { BaseTransformerTypes } from './types'
import { createHash } from 'node:crypto'
import MagicString from 'magic-string'
import { ScopeTracker, ScopeTrackerImport, walk } from 'oxc-walker'
import { createUnplugin } from 'unplugin'
import { isMissingParserError, parseAndWalkSource } from './parser'
import { createJsVueTransformIdFilter, isVueScriptRequest, JS_EXT_RE, splitTransformId } from './utils'

const HEAD_FUNCTIONS = new Set(['useHead', 'useServerHead'])
const HEAD_SOURCE_RE = /^(?:unhead(?:\/(?:client|server|legacy))?|@unhead\/[^/]+(?:\/(?:client|server|legacy))?|#imports|#app(?:\/composables\/head)?|#unhead\/composables|nuxt\/app)$/
const UNSAFE_PROPERTIES = new Set(['__proto__', 'constructor', 'prototype'])

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

function propertyName(property: ObjectProperty): string | undefined {
  if (property.computed || property.method || property.kind !== 'init')
    return
  const { key } = property
  if (key.type === 'Identifier')
    return key.name
  if (key.type === 'Literal' && (typeof key.value === 'string' || typeof key.value === 'number'))
    return String(key.value)
}

function readJson(node: Expression): JsonValue | undefined {
  if (node.type === 'Literal') {
    const value = node.value
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
      return value
  }
  if (node.type === 'UnaryExpression' && node.operator === '-' && node.argument.type === 'Literal' && typeof node.argument.value === 'number')
    return -node.argument.value
  if (node.type === 'ArrayExpression') {
    const values: JsonValue[] = []
    for (const element of node.elements) {
      const value = element && element.type !== 'SpreadElement' ? readJson(element) : undefined
      if (value === undefined)
        return
      values.push(value)
    }
    return values
  }
  if (node.type === 'ObjectExpression') {
    const values = new Map<string, JsonValue>()
    for (const property of node.properties) {
      if (property.type !== 'Property')
        return
      const key = propertyName(property)
      if (key === undefined || UNSAFE_PROPERTIES.has(key) || values.has(key))
        return
      const value = readJson(property.value)
      if (value === undefined)
        return
      values.set(key, value)
    }
    return Object.fromEntries([...values.keys()].sort().map(key => [key, values.get(key)!]))
  }
}

function canonicalJson(node: Expression): string | undefined {
  if (node.type === 'ConditionalExpression') {
    // The branches may compile separately for SSR and the client.
    const consequent = canonicalJson(node.consequent)
    return consequent === canonicalJson(node.alternate) ? consequent : undefined
  }
  if (node.type === 'ArrayExpression' || node.type === 'ObjectExpression')
    return JSON.stringify(readJson(node))
}

function staticScriptKey(tag: ObjectExpression): string | undefined {
  // Leave explicit identity, attributes and duplicate strategies to the author.
  if (tag.properties.length !== 2)
    return
  let content: Expression | undefined
  let jsonLd = false
  for (const property of tag.properties) {
    if (property.type !== 'Property')
      return
    const name = propertyName(property)
    if (name === 'type')
      jsonLd = property.value.type === 'Literal' && property.value.value === 'application/ld+json'
    else if (name === 'innerHTML' || name === 'textContent')
      content = property.value
  }
  const json = jsonLd && content && canonicalJson(content)
  if (json)
    return `unhead:jsonld:${createHash('sha256').update(json).digest('hex').slice(0, 16)}`
}

export const StaticJsonLdTransform = createUnplugin<BaseTransformerTypes | undefined, false>((options = {}) => ({
  name: 'unhead:static-json-ld',
  enforce: 'post',
  transform: {
    filter: {
      code: /application\/ld\+json/,
      id: createJsVueTransformIdFilter(options.filter?.include),
    },
    handler(code, id) {
      const { pathname, query } = splitTransformId(id)
      if (options.filter?.exclude?.some(pattern => pattern.test(id)))
        return
      if (!isVueScriptRequest(pathname, query) && !JS_EXT_RE.test(pathname) && !options.filter?.include?.some(pattern => pattern.test(id)))
        return

      const scopeTracker = new ScopeTracker({ preserveExitedScopes: true })
      const s = new MagicString(code)
      try {
        const { program } = parseAndWalkSource(code, id, { scopeTracker })
        scopeTracker.freeze()
        walk(program, {
          scopeTracker,
          enter(node) {
            if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier')
              return
            const declaration = scopeTracker.getDeclaration(node.callee.name)
            if (declaration instanceof ScopeTrackerImport && declaration.node.type === 'ImportSpecifier') {
              const { imported } = declaration.node
              const source = declaration.importNode.source.value
              if (imported.type !== 'Identifier' || !HEAD_FUNCTIONS.has(imported.name) || !HEAD_SOURCE_RE.test(source))
                return
            }
            else if (declaration || !HEAD_FUNCTIONS.has(node.callee.name)) {
              return
            }

            const argument = node.arguments[0]
            const input = argument?.type === 'ArrowFunctionExpression' ? argument.body : argument
            if (input?.type !== 'ObjectExpression')
              return
            for (const property of input.properties) {
              if (property.type !== 'Property' || propertyName(property) !== 'script' || property.value.type !== 'ArrayExpression')
                continue
              for (const tag of property.value.elements) {
                if (tag?.type !== 'ObjectExpression')
                  continue
                const key = staticScriptKey(tag)
                if (key)
                  s.appendLeft(tag.start + 1, ` key: "${key}", tagDuplicateStrategy: "replace",`)
              }
            }
          },
        })
      }
      catch (error) {
        if (isMissingParserError(error))
          throw error
        // The bundler reports syntax errors in the original source.
        return
      }
      if (s.hasChanged())
        return { code: s.toString(), map: s.generateMap({ includeContent: true, source: id }) }
    },
  },
}))
