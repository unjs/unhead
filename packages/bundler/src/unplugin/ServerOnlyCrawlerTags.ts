import type { SourceMapInput } from 'rollup'
import type { UnpluginContextMeta } from 'unplugin'
import type { ConfigEnv, UserConfig } from 'vite'
import type { BaseTransformerTypes } from './types'
import type { BuildConsumer } from './utils'
import MagicString from 'magic-string'
import { ScopeTracker, ScopeTrackerImport, walk } from 'oxc-walker'
import { isCrawlerMetaKey, resolveMetaKeyValue } from 'unhead/utils'
import { createUnplugin } from 'unplugin'
import { parseAndWalkSource } from './parser'
import { createJsVueTransformIdFilter, isVueScriptRequest, JS_EXT_RE, JS_VUE_RE, NODE_MODULES_RE, resolveBuildConsumer, splitTransformId } from './utils'

const HEAD_CALL_RE = /\buse(?:Head|HeadSafe|SeoMeta)\b/

// Nuxt auto-imports the head composables from these re-exports of `@unhead/vue`.
const NUXT_IMPORT_SOURCES = new Set(['#app/composables/head', '#imports'])

const HEAD_NAMES = new Set(['useHead', 'useHeadSafe'])
const SEO_META_NAMES = new Set(['useSeoMeta'])

/**
 * Vue calls a crawler tag value may make and still be dropped. Given a literal
 * or a function, they wrap the value and never call or read it. Given a
 * variable, they read its properties, which can run a getter or a proxy trap.
 * Any other call keeps the tag, because removing it could remove a side effect.
 */
const DROPPABLE_CALLS = new Set(['computed', 'ref', 'shallowRef'])
const DROPPABLE_CALL_SOURCES = new Set(['vue', '#imports'])
const FUNCTION_TYPES = new Set(['ArrowFunctionExpression', 'FunctionExpression'])

// The core composables take the head first: `useHead(head, input, options)`.
const CORE_SOURCE = 'unhead'
const ECMA_TARGET_RE = /^es\d+$/

function resolveCompilerConsumer(meta: UnpluginContextMeta): BuildConsumer | undefined {
  const compiler = meta.framework === 'webpack'
    ? meta.webpack.compiler
    : meta.framework === 'rspack' ? meta.rspack.compiler : undefined
  if (!compiler)
    return
  const { name, target } = compiler.options
  if (name === 'server')
    return 'server'
  // Read the target after the compiler resolves its defaults.
  const targets = Array.isArray(target) ? target : [target]
  const browserTarget = (value: unknown) => value === 'web'
    || (name === 'client' && typeof value === 'string' && (value === 'browserslist' || value.startsWith('browserslist:')))
  if (targets.some(browserTarget) && targets.every(value => browserTarget(value) || (typeof value === 'string' && ECMA_TARGET_RE.test(value))))
    return 'client'
}

export interface ServerOnlyCrawlerTagsOptions extends BaseTransformerTypes {
  /**
   * Extra import paths to consider where `useHead()` and `useSeoMeta()` may be imported from.
   */
  importPaths?: string[]
}

function staticKey(prop: any): string | undefined {
  if (prop.type !== 'Property' || prop.computed)
    return undefined
  if (prop.key?.type === 'Identifier')
    return prop.key.name
  if ((prop.key?.type === 'Literal' || prop.key?.type === 'StringLiteral') && typeof prop.key.value === 'string')
    return prop.key.value
}

function staticString(node: any): string | undefined {
  if ((node?.type === 'Literal' || node?.type === 'StringLiteral') && typeof node.value === 'string')
    return node.value
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0)
    return node.quasis[0]?.value?.cooked ?? undefined
}

function unwrap(node: any): any {
  while (node && (node.type === 'ParenthesizedExpression' || node.type === 'TSAsExpression' || node.type === 'TSSatisfiesExpression' || node.type === 'TSNonNullExpression'))
    node = node.expression
  return node
}

/**
 * Whether `node` is a literal value. Converting it to a string or JSON runs
 * only built-in code, never a getter, `toString()`, or `toJSON()`.
 */
function isLiteral(input: any): boolean {
  const node = unwrap(input)
  switch (node?.type) {
    case 'Literal':
    case 'StringLiteral':
    case 'NumericLiteral':
    case 'BooleanLiteral':
    case 'NullLiteral':
      return true
    case 'TemplateLiteral':
      return node.expressions.every(isLiteral)
    case 'UnaryExpression':
      return node.operator === '-' && isLiteral(node.argument)
    case 'ArrayExpression':
      return node.elements.every((el: any) => !el || (el.type !== 'SpreadElement' && isLiteral(el)))
    case 'ObjectExpression':
      return node.properties.every((p: any) => p.type !== 'SpreadElement' && !p.computed && p.kind === 'init' && isLiteral(p.value))
    default:
      return false
  }
}

/** Decides whether a call in a crawler tag value runs no user code. */
type IsDroppableCall = (call: any) => boolean

/**
 * Whether evaluating `node` runs no user code. A property read can run a
 * getter or a proxy trap, a spread runs an iterator, and converting a
 * variable to a string can run `toString()`. Such an expression keeps the
 * tag, so removing a droppable expression removes nothing a user can observe.
 */
function isDroppable(input: any, isDroppableCall: IsDroppableCall): boolean {
  const node = unwrap(input)
  if (!node)
    return true
  const droppable = (n: any) => isDroppable(n, isDroppableCall)
  switch (node.type) {
    case 'Literal':
    case 'StringLiteral':
    case 'NumericLiteral':
    case 'BooleanLiteral':
    case 'NullLiteral':
    case 'Identifier':
    case 'ThisExpression':
    case 'ArrowFunctionExpression':
    case 'FunctionExpression':
      return true
    case 'TemplateLiteral':
      return node.expressions.every(isLiteral)
    case 'UnaryExpression':
      return node.operator === '!' || node.operator === 'typeof' || node.operator === 'void'
        ? droppable(node.argument)
        : node.operator !== 'delete' && isLiteral(node.argument)
    case 'BinaryExpression':
      // Strict equality converts nothing. Other operators can convert an operand.
      return node.operator === '===' || node.operator === '!=='
        ? droppable(node.left) && droppable(node.right)
        : node.operator !== 'in' && node.operator !== 'instanceof' && isLiteral(node.left) && isLiteral(node.right)
    case 'LogicalExpression':
      return droppable(node.left) && droppable(node.right)
    case 'ConditionalExpression':
      return droppable(node.test) && droppable(node.consequent) && droppable(node.alternate)
    case 'ArrayExpression':
      return node.elements.every((el: any) => !el || (el.type !== 'SpreadElement' && droppable(el)))
    case 'ObjectExpression':
      return node.properties.every((p: any) => p.type !== 'SpreadElement' && !p.computed && p.kind === 'init' && droppable(p.value))
    case 'CallExpression':
      return isDroppableCall(node)
    default:
      return false
  }
}

/** Whether a `useHead` tag object is on the crawler tag list. Needs a static identity and no spread. */
function isCrawlerTag(type: string, element: any, isDroppableCall: IsDroppableCall): boolean {
  const node = unwrap(element)
  if (node?.type !== 'ObjectExpression')
    return false
  const identityKeys = type === 'meta' ? ['name', 'property'] : type === 'link' ? ['rel', 'hreflang'] : ['type']
  const props = new Map<string, any>()
  for (const p of node.properties) {
    const key = staticKey(p)
    // A spread, computed key, or prototype can supply another identity.
    if (key === undefined || key === '__proto__')
      return false
    // Runtime normalization folds attribute keys to lowercase. Keep aliases
    // because collisions and undefined values depend on input iteration order.
    if (key !== key.toLowerCase() && identityKeys.includes(key.toLowerCase()))
      return false
    // The head reads a getter on the client, so a tag with one stays.
    // A repeated key still evaluates its earlier value, so every value is checked.
    if (p.kind !== 'init' || !isDroppable(p.value, isDroppableCall))
      return false
    props.set(key, p.value)
  }
  let crawler = false
  // Every attribute the runtime check reads must be static. A dynamic one
  // could resolve to a browser-facing tag, which must stay.
  if (type === 'meta') {
    // `name` wins over `property` at runtime, as in `isCrawlerTag()` from `unhead/utils`.
    const name = staticString(props.get(props.has('name') ? 'name' : 'property'))
    crawler = name !== undefined && isCrawlerMetaKey(name)
  }
  else if (type === 'link') {
    const rel = staticString(props.get('rel'))?.toLowerCase()
    crawler = rel === 'canonical' || (rel === 'alternate' && staticString(props.get('hreflang')) !== undefined)
  }
  else if (type === 'script') {
    crawler = staticString(props.get('type'))?.toLowerCase() === 'application/ld+json'
  }
  return crawler
}

/** Whether a `useSeoMeta` property is on the crawler tag list. */
function isCrawlerSeoMetaProp(prop: any, isDroppableCall: IsDroppableCall): boolean {
  const key = staticKey(prop)
  if (key === undefined || key === 'title' || key === 'titleTemplate' || prop.method || prop.kind !== 'init')
    return false
  return isCrawlerMetaKey(resolveMetaKeyValue(key)) && isDroppable(prop.value, isDroppableCall)
}

/**
 * Removes `remove` from a comma separated list (array elements or object
 * properties). Each run of removed items goes in one edit, with one separator,
 * so a trailing comma never follows another comma. `close` is the index of
 * the closing bracket of the list.
 */
function removeListItems(s: MagicString, items: any[], remove: Set<any>, close: number) {
  for (let i = 0; i < items.length; i++) {
    if (!remove.has(items[i]))
      continue
    const first = i
    while (remove.has(items[i + 1]))
      i++
    const next = items[i + 1]
    if (next)
      s.remove(items[first].start, next.start)
    else if (first > 0)
      s.remove(items[first - 1].end, items[i].end)
    // Nothing stays, so a trailing comma goes too.
    else
      s.remove(items[first].start, close)
  }
}

/**
 * Whether an options argument does nothing for an entry with no tags. An
 * `onRendered` callback runs after every render of the head, and a variable
 * or a spread can hold one.
 */
function isInertOptions(arg: any, isDroppableCall: IsDroppableCall): boolean {
  const node = unwrap(arg)
  return node?.type === 'ObjectExpression' && node.properties.every((p: any) => {
    const key = staticKey(p)
    return key !== undefined && key !== 'onRendered' && key !== '__proto__' && p.kind === 'init' && isDroppable(p.value, isDroppableCall)
  })
}

type StripResult = 'unchanged' | 'stripped' | 'empty'

function metaIdentity(value: string | undefined): string | undefined {
  if (typeof value !== 'string')
    return
  // Media dimensions and URLs can belong to the same arrayable tag.
  const key = value.toLowerCase()
  return key.match(/^((?:og|twitter):(?:image|video|audio))(?::|$)/)?.[1] ?? key
}

function staticMetaIdentity(element: any): string | undefined {
  const node = unwrap(element)
  if (node?.type !== 'ObjectExpression')
    return
  const props = new Map<string, any>()
  for (const prop of node.properties) {
    const key = staticKey(prop)
    if (key === undefined || key === '__proto__')
      return
    const lower = key.toLowerCase()
    if (lower === 'charset')
      return
    if (lower === 'name' || lower === 'property') {
      if (key !== lower || prop.kind !== 'init')
        return
      props.set(key, prop.value)
    }
  }
  return metaIdentity(staticString(props.get(props.has('name') ? 'name' : 'property')))
}

/** Strips crawler tags from a `useHead` input object. */
function stripHeadObject(s: MagicString, obj: any, isDroppableCall: IsDroppableCall): StripResult {
  const removeProps = new Set<any>()
  const precedingKeys = new Set<string | undefined>()
  const hasPrototype = obj.properties.some((p: any) => staticKey(p) === '__proto__')
  let changed = false
  for (const prop of obj.properties) {
    const key = staticKey(prop)
    // Removing an override can expose earlier properties or inherited tags.
    // A spread or computed key can provide any tag list.
    const canExposeTags = hasPrototype || precedingKeys.has(undefined) || precedingKeys.has(key)
    precedingKeys.add(key)
    if (key !== 'meta' && key !== 'link' && key !== 'script')
      continue
    const arr = unwrap(prop.value)
    // A hole (`[, tag]`) has no node to find a separator from, so the list stays.
    if (arr?.type !== 'ArrayExpression' || !arr.elements.length || arr.elements.includes(null))
      continue
    const removeEls = new Set(arr.elements.filter((el: any) => el.type !== 'SpreadElement' && isCrawlerTag(key, el, isDroppableCall)))
    if (key === 'meta' && removeEls.size < arr.elements.length) {
      // A retained tag can claim the SSR element during hydration.
      const retained = new Set(arr.elements.filter((el: any) => !removeEls.has(el)).map(staticMetaIdentity))
      for (const element of removeEls) {
        if (retained.has(undefined) || retained.has(staticMetaIdentity(element)))
          removeEls.delete(element)
      }
    }
    if (!removeEls.size)
      continue
    changed = true
    if (removeEls.size === arr.elements.length && !canExposeTags)
      removeProps.add(prop)
    else
      removeListItems(s, arr.elements, removeEls, arr.end - 1)
  }
  removeListItems(s, obj.properties, removeProps, obj.end - 1)
  if (!changed)
    return 'unchanged'
  return removeProps.size === obj.properties.length ? 'empty' : 'stripped'
}

/** Strips crawler keys from a `useSeoMeta` input object. */
function stripSeoMetaObject(s: MagicString, obj: any, isDroppableCall: IsDroppableCall): StripResult {
  const removeProps = new Set<any>()
  const retainedKeys = new Set<string | undefined>()
  const droppable = new Set(obj.properties.filter((p: any) => isCrawlerSeoMetaProp(p, isDroppableCall)))
  const identity = (key: string | undefined) => key === undefined ? undefined : metaIdentity(resolveMetaKeyValue(key))
  const retained = new Set(obj.properties.filter((p: any) => !droppable.has(p)).map((p: any) => identity(staticKey(p))))
  for (const prop of obj.properties) {
    const key = staticKey(prop)
    // A retained spread, computed key, or duplicate can supply a default.
    // Keep the override so stripping cannot activate that earlier value.
    if (droppable.has(prop) && !retained.has(undefined) && !retained.has(identity(key)) && !retainedKeys.has(key))
      removeProps.add(prop)
    else
      retainedKeys.add(key)
  }
  if (!removeProps.size)
    return 'unchanged'
  removeListItems(s, obj.properties, removeProps, obj.end - 1)
  return removeProps.size === obj.properties.length ? 'empty' : 'stripped'
}

/** The input object of a call: `fn({ ... })` or `fn(() => ({ ... }))`. */
function inputObject(arg: any): any {
  const node = unwrap(arg)
  if (node?.type === 'ObjectExpression')
    return node
  if (node?.type === 'ArrowFunctionExpression' && node.expression) {
    const body = unwrap(node.body)
    if (body?.type === 'ObjectExpression')
      return body
  }
}

/**
 * Removes crawler-only head tags from client builds. Crawlers read the server
 * HTML, so after hydration these tags change nothing a user or crawler sees.
 *
 * useSeoMeta({ title: 'Home', ogTitle: 'Home', description: 'Hi' })
 * -> (client)
 * useSeoMeta({ title: 'Home' })
 */
export const ServerOnlyCrawlerTags = createUnplugin<ServerOnlyCrawlerTagsOptions, false>((options: ServerOnlyCrawlerTagsOptions = {}, meta) => {
  const importPaths = options.importPaths?.length ? new Set(options.importPaths) : undefined
  // Vite versions without the Environment API expose the build target in apply().
  let fallbackConsumer: BuildConsumer | undefined

  function isValidPackage(source: unknown): boolean {
    return typeof source === 'string'
      && (source === 'unhead' || source.startsWith('unhead/') || source.startsWith('@unhead/') || NUXT_IMPORT_SOURCES.has(source) || importPaths?.has(source) === true)
  }

  function shouldTransformId(id: string): boolean {
    const { pathname, query } = splitTransformId(id)
    if (NODE_MODULES_RE.test(pathname))
      return false
    if (options.filter?.exclude?.some(pattern => id.match(pattern)))
      return false
    if (options.filter?.include?.some(pattern => id.match(pattern)))
      return true
    return isVueScriptRequest(pathname, query) || JS_EXT_RE.test(pathname)
  }

  return {
    name: 'unhead:server-only-crawler-tags',
    enforce: 'post',

    transform: {
      filter: {
        code: HEAD_CALL_RE,
        id: createJsVueTransformIdFilter(options.filter?.include),
      },
      handler(code, id) {
        // Client builds only: the server must render every tag. An unknown
        // target (plain rollup) keeps the code as written.
        if (resolveBuildConsumer(this, resolveCompilerConsumer(meta) ?? fallbackConsumer) !== 'client')
          return
        if (!shouldTransformId(id))
          return

        const scopeTracker = new ScopeTracker({ preserveExitedScopes: true })
        const ast = parseAndWalkSource(code, id, { scopeTracker })
        const s = new MagicString(code)
        scopeTracker.freeze()
        // Calls nested in code this pass removed must not be edited again.
        let removedUntil = -1

        /** The exported name `local` refers to, when imported from a source `isSource` accepts or auto-imported. */
        function importedName(local: string, isSource: (source: unknown) => boolean): string | undefined {
          const decl = scopeTracker.getDeclaration(local)
          // No declaration in scope: an auto-import (e.g. Nuxt).
          if (!decl)
            return local
          if (decl instanceof ScopeTrackerImport && isSource(decl.importNode.source.value) && decl.node.type === 'ImportSpecifier' && decl.node.imported.type === 'Identifier')
            return decl.node.imported.name
        }

        function isDroppableCall(call: any): boolean {
          const { callee } = call
          // `JSON.stringify()` of a literal never reaches a getter or `toJSON()`.
          if (callee.type === 'MemberExpression' && !callee.computed && callee.object.type === 'Identifier' && callee.object.name === 'JSON' && callee.property.name === 'stringify')
            return !scopeTracker.getDeclaration('JSON') && call.arguments.every(isLiteral)
          return callee.type === 'Identifier'
            && DROPPABLE_CALLS.has(importedName(callee.name, source => DROPPABLE_CALL_SOURCES.has(source as string))!)
            && call.arguments.every((a: any) => isLiteral(a) || FUNCTION_TYPES.has(unwrap(a)?.type))
        }

        /** Whether `local` is an import from the core package, whose composables take the head first. */
        function isCoreImport(local: string): boolean {
          const decl = scopeTracker.getDeclaration(local)
          return decl instanceof ScopeTrackerImport && decl.importNode.source.value === CORE_SOURCE
        }

        walk(ast.program, {
          scopeTracker,
          enter(node: any, parent: any) {
            if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier' || node.start < removedUntil)
              return

            const name = importedName(node.callee.name, isValidPackage)
            if (!name)
              return

            const isSeoMeta = SEO_META_NAMES.has(name)
            if (!isSeoMeta && !HEAD_NAMES.has(name))
              return

            const inputIndex = isCoreImport(node.callee.name) ? 1 : 0
            const obj = inputObject(node.arguments[inputIndex])
            if (!obj)
              return

            const result = isSeoMeta ? stripSeoMetaObject(s, obj, isDroppableCall) : stripHeadObject(s, obj, isDroppableCall)
            if (result !== 'unchanged')
              removedUntil = node.end
            // A call with nothing left goes, so its runtime can drop from the bundle.
            // Its other arguments must do nothing then: a head before the input, inert options after it.
            const inert = (a: any, i: number) => i === inputIndex || (i < inputIndex ? isDroppable(a, isDroppableCall) : isInertOptions(a, isDroppableCall))
            if (result === 'empty' && parent?.type === 'ExpressionStatement' && node.arguments.every(inert))
              s.overwrite(parent.start, parent.end, ';')
          },
        })

        if (s.hasChanged()) {
          return {
            code: s.toString(),
            map: s.generateMap({ includeContent: true, source: id }) as SourceMapInput,
          }
        }
      },
    },
    vite: {
      sharedDuringBuild: true,
      apply(_config: UserConfig, env: ConfigEnv) {
        // The dev server shares one module graph between client and SSR
        // renders, so this is a build-only optimization like tree-shaking.
        if (env.command === 'serve')
          return false
        fallbackConsumer = env.isSsrBuild ? 'server' : 'client'
        return true
      },
    },
  }
})

const HEAD_FACTORY_RE = /\b(?:createHead|createStreamableHead)\b/
const HEAD_FACTORIES = new Map([
  ['unhead/client', 'createHead'],
  ['unhead/stream/client', 'createStreamableHead'],
  ['@unhead/react/stream/client', 'createStreamableHead'],
  ['@unhead/solid-js/stream/client', 'createStreamableHead'],
  ['@unhead/svelte/stream/client', 'createStreamableHead'],
])
const HEAD_FACTORY_SOURCES = [...HEAD_FACTORIES.keys()]
const PLUGIN_LOCAL = '__unheadServerOnlyCrawlerTags'

/**
 * Registers `ServerOnlyCrawlerTagsPlugin` on ordinary and streamed client heads.
 * The plugin covers tags the transform cannot read, such as `head.push()` input.
 *
 * Framework packages call `createHead()` from `unhead/client`, so this reads
 * `node_modules` too. The bundler only uses this transform with `runtime: true`.
 */
export const ServerOnlyCrawlerTagsRuntime = createUnplugin<object | undefined, false>((_, meta) => {
  let fallbackConsumer: BuildConsumer | undefined
  return {
    name: 'unhead:server-only-crawler-tags-runtime',
    enforce: 'post',
    transform: {
      filter: {
        code: { include: [HEAD_FACTORY_RE], exclude: [new RegExp(PLUGIN_LOCAL)] },
        id: { include: [JS_VUE_RE] },
      },
      handler(code, id) {
        if (resolveBuildConsumer(this, resolveCompilerConsumer(meta) ?? fallbackConsumer) !== 'client' || !HEAD_FACTORY_SOURCES.some(source => code.includes(source)))
          return
        const scopeTracker = new ScopeTracker({ preserveExitedScopes: true })
        const ast = parseAndWalkSource(code, id, { scopeTracker })
        const s = new MagicString(code)
        scopeTracker.freeze()

        function isHeadFactory(local: string, member?: string): boolean {
          const decl = scopeTracker.getDeclaration(local)
          if (!(decl instanceof ScopeTrackerImport))
            return false
          const factory = HEAD_FACTORIES.get(decl.importNode.source.value as string)
          if (!factory)
            return false
          const spec = decl.node
          if (member !== undefined)
            return spec.type === 'ImportNamespaceSpecifier' && member === factory
          if (spec.type !== 'ImportSpecifier')
            return false
          const imported = spec.imported
          return (imported.type === 'Identifier' ? imported.name : imported.value) === factory
        }

        function isClientHeadFactory(callee: any): boolean {
          if (callee.type === 'Identifier')
            return isHeadFactory(callee.name)
          const property = callee.computed ? callee.property?.value : callee.property?.name
          return callee.type === 'MemberExpression'
            && callee.object.type === 'Identifier'
            && typeof property === 'string'
            && isHeadFactory(callee.object.name, property)
        }

        walk(ast.program, {
          scopeTracker,
          enter(node: any) {
            if (node.type !== 'CallExpression' || !isClientHeadFactory(node.callee))
              return
            const [arg] = node.arguments
            if (!arg) {
              s.appendLeft(node.end - 1, `{ plugins: [${PLUGIN_LOCAL}] }`)
              return
            }
            if (arg.type === 'SpreadElement')
              return
            // A plugin setup can render synchronously, so the crawler filter must already be active.
            s.prependRight(arg.start, `(({ plugins, ...o }) => ({ ...o, plugins: [${PLUGIN_LOCAL}, ...(plugins || [])] }))((`)
            s.appendLeft(arg.end, ') ?? {})')
          },
        })
        if (!s.hasChanged())
          return
        s.prepend(`import { ServerOnlyCrawlerTagsPlugin as ${PLUGIN_LOCAL} } from 'unhead/plugins';\n`)
        return {
          code: s.toString(),
          map: s.generateMap({ includeContent: true, source: id }) as SourceMapInput,
        }
      },
    },
    vite: {
      sharedDuringBuild: true,
      apply(_config: UserConfig, env: ConfigEnv) {
        // Build only, like the transform: the dev server shares one module graph.
        if (env.command === 'serve')
          return false
        fallbackConsumer = env.isSsrBuild ? 'server' : 'client'
        return true
      },
    },
  }
})
