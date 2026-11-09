import type { SourceMapInput } from 'rollup'
import type { ConfigEnv, UserConfig } from 'vite'
import type { BaseTransformerTypes } from './types'
import type { BuildConsumer } from './utils'
import MagicString from 'magic-string'
import { ScopeTracker, ScopeTrackerImport, walk } from 'oxc-walker'
import { resolveMetaKeyValue } from 'unhead/utils'
import { createUnplugin } from 'unplugin'
import { parseAndWalkSource } from './parser'
import { createJsVueTransformIdFilter, isVueScriptRequest, JS_EXT_RE, NODE_MODULES_RE, resolveBuildConsumer, splitTransformId } from './utils'

const HEAD_CALL_RE = /\buse(?:Head|HeadSafe|SeoMeta)\b/

// Nuxt auto-imports the head composables from these re-exports of `@unhead/vue`.
const NUXT_IMPORT_SOURCES = new Set(['#app/composables/head', '#imports'])

const HEAD_NAMES = new Set(['useHead', 'useHeadSafe'])
const SEO_META_NAMES = new Set(['useSeoMeta'])

/** `meta` names and properties that only crawlers read. A prefix ends with `:`. */
const CRAWLER_META_PREFIXES = ['og:', 'twitter:', 'article:'] as const
const CRAWLER_META_NAMES = new Set(['description', 'robots', 'keywords'])

/**
 * Calls a crawler tag value may make and still be dropped: they read or wrap
 * a value and have no other effect. Any other call keeps the tag, because
 * removing it could remove a side effect.
 */
const DROPPABLE_CALLS = new Set(['computed', 'ref', 'shallowRef', 'toRef', 'toValue', 'unref', 't', '$t', 'JSON.stringify'])

function calleeName(callee: any): string | undefined {
  if (callee.type === 'Identifier')
    return callee.name
  if (callee.type === 'MemberExpression' && !callee.computed && callee.object.type === 'Identifier' && callee.property.type === 'Identifier')
    return `${callee.object.name}.${callee.property.name}`
}

export interface ServerOnlyCrawlerTagsOptions extends BaseTransformerTypes {
  /**
   * Extra import paths to consider where `useHead()` and `useSeoMeta()` may be imported from.
   */
  importPaths?: string[]
}

/** Whether a resolved `meta` name or property is on the crawler tag list. */
export function isCrawlerMetaKey(key: string): boolean {
  const lower = key.toLowerCase()
  return CRAWLER_META_NAMES.has(lower) || CRAWLER_META_PREFIXES.some(prefix => lower.startsWith(prefix))
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
 * Whether evaluating `node` can only produce a value. Removing a droppable
 * expression removes nothing a user can observe.
 */
function isDroppable(input: any): boolean {
  const node = unwrap(input)
  if (!node)
    return true
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
      return node.expressions.every(isDroppable)
    case 'MemberExpression':
      return isDroppable(node.object) && (!node.computed || isDroppable(node.property))
    case 'ChainExpression':
      return isDroppable(node.expression)
    case 'UnaryExpression':
      return node.operator !== 'delete' && isDroppable(node.argument)
    case 'BinaryExpression':
    case 'LogicalExpression':
      return isDroppable(node.left) && isDroppable(node.right)
    case 'ConditionalExpression':
      return isDroppable(node.test) && isDroppable(node.consequent) && isDroppable(node.alternate)
    case 'ArrayExpression':
      return node.elements.every((el: any) => !el || isDroppable(el.type === 'SpreadElement' ? el.argument : el))
    case 'ObjectExpression':
      return node.properties.every((p: any) => p.type === 'SpreadElement'
        ? isDroppable(p.argument)
        : !p.computed && p.kind === 'init' && isDroppable(p.value))
    case 'CallExpression':
      return DROPPABLE_CALLS.has(calleeName(node.callee)!)
        && node.arguments.every(isDroppable)
    default:
      return false
  }
}

/** Whether a `useHead` tag object is on the crawler tag list. Needs a static identity and no spread. */
function isCrawlerTag(type: string, element: any): boolean {
  const node = unwrap(element)
  if (node?.type !== 'ObjectExpression')
    return false
  const props = new Map<string, any>()
  for (const p of node.properties) {
    const key = staticKey(p)
    // A spread or computed key could override the identity, so the tag stays.
    if (key === undefined)
      return false
    props.set(key, p.value)
  }
  let crawler = false
  if (type === 'meta') {
    const name = staticString(props.get('name')) ?? staticString(props.get('property'))
    crawler = name !== undefined && isCrawlerMetaKey(name)
  }
  else if (type === 'link') {
    const rel = staticString(props.get('rel'))?.toLowerCase()
    crawler = rel === 'canonical' || (rel === 'alternate' && props.has('hreflang'))
  }
  else if (type === 'script') {
    crawler = staticString(props.get('type'))?.toLowerCase() === 'application/ld+json'
  }
  return crawler && [...props.values()].every(isDroppable)
}

/** Whether a `useSeoMeta` property is on the crawler tag list. */
function isCrawlerSeoMetaProp(prop: any): boolean {
  const key = staticKey(prop)
  if (key === undefined || key === 'title' || key === 'titleTemplate' || prop.method || prop.kind !== 'init')
    return false
  return isCrawlerMetaKey(resolveMetaKeyValue(key)) && isDroppable(prop.value)
}

/**
 * Removes `remove` from a comma separated list (array elements or object
 * properties), with the separator next to each removed item.
 */
function removeListItems(s: MagicString, items: any[], remove: Set<any>) {
  items.forEach((item, i) => {
    if (!item || !remove.has(item))
      return
    const next = items[i + 1]
    if (next)
      s.remove(item.start, next.start)
    else if (i > 0)
      s.remove(items[i - 1].end, item.end)
    else
      s.remove(item.start, item.end)
  })
}

type StripResult = 'unchanged' | 'stripped' | 'empty'

/** Strips crawler tags from a `useHead` input object. */
function stripHeadObject(s: MagicString, obj: any): StripResult {
  const removeProps = new Set<any>()
  let changed = false
  for (const prop of obj.properties) {
    const key = staticKey(prop)
    if (key !== 'meta' && key !== 'link' && key !== 'script')
      continue
    const arr = unwrap(prop.value)
    if (arr?.type !== 'ArrayExpression' || !arr.elements.length)
      continue
    const removeEls = new Set(arr.elements.filter((el: any) => el && el.type !== 'SpreadElement' && isCrawlerTag(key, el)))
    if (!removeEls.size)
      continue
    changed = true
    if (removeEls.size === arr.elements.length)
      removeProps.add(prop)
    else
      removeListItems(s, arr.elements, removeEls)
  }
  removeListItems(s, obj.properties, removeProps)
  if (!changed)
    return 'unchanged'
  return removeProps.size === obj.properties.length ? 'empty' : 'stripped'
}

/** Strips crawler keys from a `useSeoMeta` input object. */
function stripSeoMetaObject(s: MagicString, obj: any): StripResult {
  const removeProps = new Set(obj.properties.filter(isCrawlerSeoMetaProp))
  if (!removeProps.size)
    return 'unchanged'
  removeListItems(s, obj.properties, removeProps)
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
export const ServerOnlyCrawlerTags = createUnplugin<ServerOnlyCrawlerTagsOptions, false>((options: ServerOnlyCrawlerTagsOptions = {}) => {
  const importPaths = options.importPaths?.length ? new Set(options.importPaths) : undefined
  // See `TreeshakeServerComposables`: a per-build fallback for bundlers without `this.environment`.
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
        if (resolveBuildConsumer(this, fallbackConsumer) !== 'client')
          return
        if (!shouldTransformId(id))
          return

        const scopeTracker = new ScopeTracker({ preserveExitedScopes: true })
        const ast = parseAndWalkSource(code, id, { scopeTracker })
        const s = new MagicString(code)
        scopeTracker.freeze()
        // Calls nested in code this pass removed must not be edited again.
        let removedUntil = -1

        walk(ast.program, {
          scopeTracker,
          enter(node: any, parent: any) {
            if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier' || node.start < removedUntil)
              return

            const decl = scopeTracker.getDeclaration(node.callee.name)
            let name: string
            if (decl instanceof ScopeTrackerImport) {
              if (!isValidPackage(decl.importNode.source.value) || decl.node.type !== 'ImportSpecifier' || decl.node.imported.type !== 'Identifier')
                return
              name = decl.node.imported.name
            }
            else if (!decl) {
              // No declaration in scope: an auto-import (e.g. Nuxt).
              name = node.callee.name
            }
            else {
              return
            }

            const isSeoMeta = SEO_META_NAMES.has(name)
            if (!isSeoMeta && !HEAD_NAMES.has(name))
              return

            const obj = inputObject(node.arguments[0])
            if (!obj)
              return

            const result = isSeoMeta ? stripSeoMetaObject(s, obj) : stripHeadObject(s, obj)
            if (result !== 'unchanged')
              removedUntil = node.end
            // A call with nothing left goes, so its runtime can drop from the bundle.
            // The options argument is ignored then: it only applies to the input.
            if (result === 'empty' && parent?.type === 'ExpressionStatement' && node.arguments.slice(1).every(isDroppable))
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
    webpack(ctx) {
      fallbackConsumer = ctx.name === 'server' ? 'server' : 'client'
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
