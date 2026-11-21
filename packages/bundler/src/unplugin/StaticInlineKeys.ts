import type { CallExpression, Expression, ObjectExpression, ObjectProperty } from 'oxc-parser'
import type { ResolvedConfig } from 'vite'
import type { BaseTransformerTypes } from './types'
import { createHash } from 'node:crypto'
import MagicString from 'magic-string'
import { ScopeTracker, ScopeTrackerImport, ScopeTrackerVariable, walk } from 'oxc-walker'
import { dedupeKey, normalizeProps } from 'unhead/utils'
import { createUnplugin } from 'unplugin'
import { isMissingParserError, parseAndWalkSource } from './parser'
import { isVueScriptRequest, JS_EXT_RE, NODE_MODULES_RE, SOURCE_FILE_RE, splitTransformId } from './utils'

const MIN_INLINE_LENGTH = 4096
const HEAD_FUNCTIONS = new Set(['useHead', 'useServerHead'])
const HEAD_IMPORT_RE = /^(?:unhead|@unhead\/(?:vue|react|solid-js|svelte)|#imports|#app(?:\/composables\/head)?|#unhead\/composables|nuxt\/app)$/
const VARIABLE_CONTENT_RE = /%\w|[\r\0]|<\/(?:script|style|noscript)/i
const PACKAGE_NAME_RE = /^(?:@[^/]+\/)?[^./][^/]*/

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

function resolveStaticText(value: Expression, scope: ScopeTracker): string | undefined {
  if (value.type === 'Identifier') {
    const declaration = scope.getDeclaration(value.name)
    if (declaration instanceof ScopeTrackerVariable && declaration.variableNode.kind === 'const') {
      const init = declaration.variableNode.declarations.find(item => item.id === declaration.node)?.init
      return init ? staticText(init) : undefined
    }
  }
  return staticText(value)
}

function isHeadCall(callee: CallExpression['callee'], scope: ScopeTracker, allowAutoImport: boolean): boolean {
  const binding = callee.type === 'MemberExpression' ? callee.object : callee
  if (binding.type !== 'Identifier')
    return false
  const declaration = scope.getDeclaration(binding.name)
  if (!declaration)
    return allowAutoImport && callee.type === 'Identifier' && HEAD_FUNCTIONS.has(callee.name)
  if (!(declaration instanceof ScopeTrackerImport) || !HEAD_IMPORT_RE.test(declaration.importNode.source.value))
    return false
  if (declaration.node.type === 'ImportNamespaceSpecifier')
    return callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier' && HEAD_FUNCTIONS.has(callee.property.name)
  return callee.type === 'Identifier' && declaration.node.type === 'ImportSpecifier'
    && declaration.node.imported.type === 'Identifier' && HEAD_FUNCTIONS.has(declaration.node.imported.name)
}

function inlineBody(tag: ObjectExpression, name: 'script' | 'style' | 'noscript', scope: ScopeTracker) {
  const fields = new Map<string, Expression>()
  for (const field of tag.properties) {
    const prop = field.type === 'Property' ? propertyName(field) : undefined
    if (prop === undefined || fields.has(prop) || field.type !== 'Property')
      return
    fields.set(prop, field.value)
  }
  const html = fields.get('innerHTML')
  const text = fields.get('textContent')
  const content = html || text
  if (!content || (html && text) || fields.has('key'))
    return
  const strategy = fields.get('tagDuplicateStrategy')
  const strategyValue = strategy && resolveStaticText(strategy, scope)
  if (strategy && strategyValue !== 'merge' && strategyValue !== 'replace')
    return

  // Check existing identity through the same normalization as the renderer.
  // Treat a present attribute as nonempty because it can resolve at runtime.
  const attrs = Object.fromEntries([...fields.keys()]
    .filter(field => field !== 'innerHTML' && field !== 'textContent')
    .map(field => [field, 'present']))
  const normalized = normalizeProps({ tag: name, props: {} }, attrs)
  if (dedupeKey(normalized) || normalized.props.src || [...fields.keys()].some(field => field.toLowerCase() === 'data-hid'))
    return
  if (name === 'script') {
    for (const [field, type] of fields) {
      if (field.toLowerCase() !== 'type')
        continue
      const value = resolveStaticText(type, scope)?.trim().toLowerCase()
      if (value === undefined || value === 'importmap' || value === 'speculationrules' || value.endsWith('json'))
        return
    }
  }
  return { body: resolveStaticText(content, scope), hasStrategy: !!strategy }
}

function packageName(pathname: string): string | undefined {
  return pathname.replaceAll('\\', '/').split('/node_modules/').at(-1)?.match(PACKAGE_NAME_RE)?.[0]
}

function bundlesDependency(environment: ResolvedConfig['environments'][string], name: string) {
  const { external, noExternal } = environment.resolve
  if (external === true || external?.some(id => id === name || id.startsWith(`${name}/`)))
    return false
  return noExternal === true || (Array.isArray(noExternal) && noExternal.some(rule =>
    typeof rule === 'string' ? rule === name : name.match(rule) !== null))
}

export const StaticInlineKeys = createUnplugin<StaticInlineKeysOptions, false>((options) => {
  let serverEnvironments: ResolvedConfig['environments'][string][] = []
  return {
    name: 'unhead:static-inline-keys',
    enforce: 'post',
    vite: {
      apply: 'build',
      configResolved(config) {
        serverEnvironments = Object.values(config.environments).filter(env => env.consumer === 'server')
      },
    },
    transform: {
      filter: {
        code: /\buse(?:Server)?Head\b/,
        id: { include: [SOURCE_FILE_RE, ...(options.filter?.include ?? [])], exclude: options.filter?.exclude },
      },
      handler(code, id) {
        const { pathname, query } = splitTransformId(id)
        const isVueScript = isVueScriptRequest(pathname, query)
        const isSvelteModule = pathname.endsWith('.svelte') && !query
        if (code.length < MIN_INLINE_LENGTH || options.filter?.exclude?.some(pattern => id.match(pattern)))
          return
        if (!isVueScript && !isSvelteModule && !JS_EXT_RE.test(pathname) && !options.filter?.include?.some(pattern => id.match(pattern)))
          return
        const dependency = NODE_MODULES_RE.test(pathname)
        if (dependency) {
          const name = packageName(pathname)
          if (!name || !serverEnvironments.length || !serverEnvironments.every(env => bundlesDependency(env, name)))
            return
        }

        const scopeTracker = new ScopeTracker({ preserveExitedScopes: true })
        let parsed: ReturnType<typeof parseAndWalkSource>
        try {
          parsed = parseAndWalkSource(code, isSvelteModule ? `${pathname}.js` : id, { scopeTracker })
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
            // Entry options can override the normalized tag identity.
            if (node.type !== 'CallExpression' || node.arguments.length !== 1
              || !isHeadCall(node.callee, scopeTracker, !dependency && options.framework === '@unhead/vue' && isVueScript)) {
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
              if (name !== 'script' && name !== 'style' && name !== 'noscript')
                continue
              const tags = property.value.type === 'ArrayExpression' ? property.value.elements : [property.value]
              for (const tag of tags) {
                if (!tag || tag.type === 'SpreadElement')
                  continue
                const inline = tag.type === 'ObjectExpression'
                  ? inlineBody(tag, name, scopeTracker)
                  : { body: resolveStaticText(tag, scopeTracker), hasStrategy: false }
                if (!inline?.body || inline.body.length < MIN_INLINE_LENGTH || VARIABLE_CONTENT_RE.test(inline.body)
                  || (name === 'script' && inline.body.includes('<!--'))) {
                  continue
                }
                const hash = createHash('sha256').update(name).update('\0').update(inline.body, 'utf16le').digest('hex').slice(0, 16)
                const key = `key:"unhead:inline:${hash}",${inline.hasStrategy ? '' : 'tagDuplicateStrategy:"replace",'}`
                if (tag.type === 'ObjectExpression') {
                  s.appendLeft(tag.start + 1, key)
                }
                else {
                  s.prependRight(tag.start, `{${key}innerHTML:`)
                  s.appendLeft(tag.end, '}')
                }
              }
            }
          },
        })
        if (s.hasChanged())
          return { code: s.toString(), map: options.sourcemap === false ? null : s.generateMap({ includeContent: true, source: id }) }
      },
    },
  }
})
