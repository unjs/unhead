import type { CallExpression, Expression, ObjectExpression, ObjectProperty } from 'oxc-parser'
import type { Plugin } from 'vite'
import type { BaseTransformerTypes } from './types'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import MagicString from 'magic-string'
import { ScopeTracker, ScopeTrackerImport, ScopeTrackerVariable, walk } from 'oxc-walker'
import { getInlineTagKey, MIN_INLINE_LENGTH } from '../inlineTagKey'
import { isMissingParserError, parseAndWalkSource } from './parser'
import { isVueScriptRequest, JS_EXT_RE, NODE_MODULES_RE, SOURCE_FILE_RE, splitTransformId } from './utils'

const HEAD_FUNCTIONS = new Set(['useHead', 'useServerHead'])
const HEAD_IMPORT_RE = /^(?:unhead|@unhead\/(?:vue|react|solid-js|svelte)|#imports|#app(?:\/composables\/head)?|#unhead\/composables|nuxt\/app)$/
const HEAD_FACTORY_IMPORT_RE = /^(?:unhead|@unhead\/(?:vue|react|solid-js|svelte))\/(?:client|server)$/
const HEAD_INJECT_IMPORTS = new Set(['@unhead/vue', '#app', '#app/composables/head', '#unhead/composables', 'nuxt/app'])
const ABSOLUTE_PATH_PATTERN_RE = /^\^(?:[a-z]:)?\\[\\/](?![?*{])/i

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

function calleeDeclaration(callee: CallExpression['callee'], scope: ScopeTracker) {
  const binding = callee.type === 'MemberExpression' ? callee.object : callee
  if (binding.type === 'Identifier')
    return scope.getDeclaration(binding.name)
}

function importedFunctionName(callee: CallExpression['callee'], declaration: ScopeTrackerImport) {
  const name = declaration.node.type === 'ImportNamespaceSpecifier' && callee.type === 'MemberExpression' && !callee.computed
    ? callee.property
    : declaration.node.type === 'ImportSpecifier' && callee.type === 'Identifier' ? declaration.node.imported : undefined
  return name?.type === 'Identifier' ? name.name : undefined
}

function createsHead(callee: CallExpression['callee'], scope: ScopeTracker): boolean {
  const declaration = calleeDeclaration(callee, scope)
  if (!(declaration instanceof ScopeTrackerImport))
    return false
  const source = declaration.importNode.source.value
  const name = importedFunctionName(callee, declaration)
  return (name === 'createHead' && HEAD_FACTORY_IMPORT_RE.test(source))
    || (name === 'injectHead' && HEAD_INJECT_IMPORTS.has(source))
}

function headInputIndex(callee: CallExpression['callee'], scope: ScopeTracker, heads: Set<ScopeTrackerVariable['node']>, allowAutoImport: boolean): 0 | 1 | undefined {
  const declaration = calleeDeclaration(callee, scope)
  if (callee.type === 'MemberExpression' && !callee.computed && callee.property.type === 'Identifier' && callee.property.name === 'push'
    && declaration instanceof ScopeTrackerVariable && heads.has(declaration.node)) {
    return 0
  }
  if (!declaration)
    return allowAutoImport && callee.type === 'Identifier' && HEAD_FUNCTIONS.has(callee.name) ? 0 : undefined
  if (!(declaration instanceof ScopeTrackerImport) || !HEAD_IMPORT_RE.test(declaration.importNode.source.value))
    return
  const name = importedFunctionName(callee, declaration)
  if (name && HEAD_FUNCTIONS.has(name))
    return declaration.importNode.source.value === 'unhead' ? 1 : 0
}

function inlineInput(tag: ObjectExpression, scope: ScopeTracker) {
  const input: Record<string, unknown> = {}
  for (const field of tag.properties) {
    const prop = field.type === 'Property' ? propertyName(field) : undefined
    if (prop === undefined || prop === '__proto__' || Object.hasOwn(input, prop) || field.type !== 'Property')
      return
    if (prop === 'innerHTML' || prop === 'textContent' || prop === 'tagDuplicateStrategy' || prop.toLowerCase() === 'type')
      input[prop] = resolveStaticText(field.value, scope)
    else if (prop === 'processTemplateParams' && field.value.type === 'Literal' && field.value.value === false)
      input[prop] = false
    else
      input[prop] = 'present'
  }
  return input
}

interface NamedPackage {
  directory: string
  name: string
}

function nearestNamedPackage(dir: string, cache: Map<string, NamedPackage | undefined>): NamedPackage | undefined {
  if (cache.has(dir))
    return cache.get(dir)
  const manifest = join(dir, 'package.json')
  const parent = dirname(dir)
  const name: unknown = existsSync(manifest) ? JSON.parse(readFileSync(manifest, 'utf8'))?.name : undefined
  let result: NamedPackage | undefined
  if (typeof name === 'string' && name)
    result = { directory: dir, name }
  else if (dir !== parent)
    result = nearestNamedPackage(parent, cache)
  cache.set(dir, result)
  return result
}

function isWithin(root: string, file: string): boolean {
  const fromRoot = relative(root, file)
  return fromRoot !== '..' && !fromRoot.startsWith(`..${sep}`) && !isAbsolute(fromRoot)
}

export function StaticInlineKeys(options: StaticInlineKeysOptions): Plugin {
  let app: { root: string, owner: NamedPackage | undefined, preserveSymlinks: boolean, externals: (string | RegExp)[] } | undefined
  const packages = new Map<string, NamedPackage | undefined>()
  return {
    name: 'unhead:static-inline-keys',
    apply: 'build',
    enforce: 'post',
    async configResolved(config) {
      app = undefined
      const preserveSymlinks = config.resolve.preserveSymlinks
      const root = existsSync(config.root) ? realpathSync(config.root) : resolve(config.root)
      const owner = nearestNamedPackage(root, packages)
      const externals: (string | RegExp)[] = []
      for (const env of Object.values(config.environments)) {
        if (env.consumer !== 'server')
          continue
        const buildExternal = env.build.rolldownOptions?.external ?? env.build.rollupOptions?.external
        const { external } = env.resolve
        if (external === true || typeof buildExternal === 'function')
          return
        externals.push(...(external || []))
        if (buildExternal)
          externals.push(...(Array.isArray(buildExternal) ? buildExternal : [buildExternal]))
      }
      if (externals.some(rule => typeof rule === 'string' && (rule.startsWith('.') || (owner && (rule === owner.name || rule.startsWith(`${owner.name}/`))))))
        return

      const patterns = externals.filter((rule): rule is RegExp => typeof rule !== 'string')
      const hasPathAlias = config.resolve.alias.some(({ find, replacement }) => (typeof find !== 'string' || isAbsolute(find))
        && isAbsolute(replacement) && isWithin(root, replacement))
      // Patterns that can match an unresolved import cannot be checked against the file alone.
      if (patterns.length && (hasPathAlias || patterns.some(rule => rule.multiline || rule.source.includes('|') || !ABSOLUTE_PATH_PATTERN_RE.test(rule.source))))
        return

      const externalIds = externals.filter((rule): rule is string => typeof rule === 'string' && !isAbsolute(rule))
      if (externalIds.length) {
        // The client may resolve a specifier that the SSR build leaves external.
        const resolveExternal = config.createResolver()
        const importer = join(root, 'index.html')
        const paths = await Promise.all(externalIds.map(id => resolveExternal(id, importer))).catch(() => {
          // Fail closed if the build cannot establish parity for an external specifier.
          config.logger.warn('Unhead skipped automatic inline keys because an SSR external could not be resolved.')
        })
        if (!paths)
          return
        for (const path of paths) {
          if (path && isAbsolute(path))
            externals.push(splitTransformId(path).pathname)
        }
      }
      app = { root, owner, preserveSymlinks, externals }
    },
    transform: {
      order: 'post',
      filter: {
        code: /\b(?:use(?:Server)?Head|createHead|injectHead)\b/,
        id: { include: [SOURCE_FILE_RE, ...(options.filter?.include ?? [])], exclude: options.filter?.exclude },
      },
      handler(code, id) {
        const { pathname, query } = splitTransformId(id)
        const isVueScript = isVueScriptRequest(pathname, query)
        const isSvelteModule = pathname.endsWith('.svelte') && !query
        if (!app || code.length < MIN_INLINE_LENGTH || options.filter?.exclude?.some(pattern => id.match(pattern)))
          return
        if (!isVueScript && !isSvelteModule && !JS_EXT_RE.test(pathname) && !options.filter?.include?.some(pattern => id.match(pattern)))
          return
        if (!isAbsolute(pathname) || NODE_MODULES_RE.test(pathname) || (app.preserveSymlinks && !existsSync(pathname)))
          return
        // An SSR-external parent can load a dependency through Node, outside this transform.
        const file = app.preserveSymlinks ? realpathSync(pathname) : resolve(pathname)
        if (!isWithin(app.root, file) || NODE_MODULES_RE.test(file) || nearestNamedPackage(dirname(file), packages) !== app.owner)
          return
        const normalizedFile = file.replaceAll('\\', '/')
        if (app.externals.some(rule => typeof rule === 'string' ? rule === pathname || rule === file || rule === normalizedFile : pathname.search(rule) !== -1 || normalizedFile.search(rule) !== -1))
          return

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
        const heads = new Set<ScopeTrackerVariable['node']>()
        if (code.includes('push') && /\b(?:createHead|injectHead)\b/.test(code)) {
          walk(parsed.program, {
            scopeTracker,
            enter(node, parent) {
              if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init?.type === 'CallExpression'
                && parent?.type === 'VariableDeclaration' && parent.kind === 'const' && createsHead(node.init.callee, scopeTracker)) {
                heads.add(node.id)
              }
            },
          })
        }
        const s = new MagicString(code)
        walk(parsed.program, {
          scopeTracker,
          enter(node, parent) {
            // A caller can patch a returned entry with a new input.
            if (node.type !== 'CallExpression' || parent?.type !== 'ExpressionStatement')
              return
            const index = headInputIndex(node.callee, scopeTracker, heads, options.framework === '@unhead/vue' && isVueScript)
            // Entry options can override the normalized tag identity.
            if (index === undefined || node.arguments.length !== index + 1)
              return

            const argument = node.arguments[index]
            // A parameter can shadow a constant in the surrounding scope.
            if (argument?.type === 'ArrowFunctionExpression' && argument.params.length)
              return
            let input = argument?.type === 'ArrowFunctionExpression' ? argument.body : argument
            while (input?.type === 'ParenthesizedExpression')
              input = input.expression
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
                const inline = tag.type === 'ObjectExpression' ? inlineInput(tag, scopeTracker) : { innerHTML: resolveStaticText(tag, scopeTracker) }
                const identity = inline && getInlineTagKey(name, inline)
                if (!identity)
                  continue
                const key = `key:"${identity.key}",${identity.tagDuplicateStrategy ? 'tagDuplicateStrategy:"replace",' : ''}`
                if (tag.type === 'ObjectExpression') {
                  s.appendLeft(tag.start + 1, key)
                }
                else {
                  const shorthand = property.shorthand ? `${name}:` : ''
                  s.prependRight(tag.start, `${shorthand}{${key}innerHTML:`)
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
}
