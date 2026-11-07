import type { SourceMapInput } from 'rollup'
import type { CompiledTags } from 'unhead/compiled/compile'
import type { ConfigEnv, UserConfig } from 'vite'
import type { BaseTransformerTypes } from './types'
import MagicString from 'magic-string'
import { ScopeTracker, ScopeTrackerImport, walk } from 'oxc-walker'
import { compileTags, dynamicValue } from 'unhead/compiled/compile'
import { normalizeProps, TagConfigKeys, unpackMeta } from 'unhead/utils'
import { createUnplugin } from 'unplugin'
import { isMissingParserError, parseAndWalkSource } from './parser'
import { createJsVueTransformIdFilter, isVueScriptRequest, JS_EXT_RE, NODE_MODULES_RE, splitTransformId } from './utils'

const HEAD_CALL_RE = /\buse(?:Server)?(?:Head|SeoMeta)\b/
const COMMONJS_RE = /\.c[jt]s$/
const TOKEN_RE = /[]/
const DYNAMIC_VALUE_JSON_RE = /"(\d+)"/g

const RUNTIME = '@unhead/vue/compiled'
// `@unhead/vue` resolves the head itself. An auto import or another path may stand for a
// wrapper that resolves it some other way, such as Nuxt, so the call passes the head
// that the auto-imported `injectHead` finds when there is one.
const AUTO_HEAD = `{ head: typeof injectHead === 'function' ? injectHead() : undefined }`

type HeadKind = 'head' | 'seo'
const CALLEES = new Map<string, HeadKind>([['useHead', 'head'], ['useServerHead', 'head'], ['useSeoMeta', 'seo'], ['useServerSeoMeta', 'seo']])

const WRAPPERS = new Set(['ParenthesizedExpression', 'TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression', 'TSTypeAssertion'])
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const SHAPE_NODES = new Set(['ObjectExpression', 'ArrayExpression'])
// keys v3 reads as config of the whole flat entry, not as meta
const ENTRY_SEO_KEYS = new Set([...TagConfigKeys, 'class', 'style', '_flatMeta'])

const BAIL = Symbol('bail')

export interface CompileTransformOptions extends BaseTransformerTypes {
  /**
   * Extra import paths of `useHead` and `useSeoMeta`, as for `UseSeoMetaTransform`.
   */
  importPaths?: string[]
}

type CompiledCall
  = | { _tag: 'Ok', tags: CompiledTags, values: any[], loose?: string }
    | { _tag: 'Bail', reason: string }

function bail(reason: string): CompiledCall {
  return { _tag: 'Bail', reason }
}

function unwrap(node: any): any {
  while (WRAPPERS.has(node?.type))
    node = node.expression
  return node
}

function staticKey(key: any): string | undefined {
  if (key.type === 'Identifier')
    return key.name
  if (key.type === 'Literal' && (typeof key.value === 'string' || typeof key.value === 'number'))
    return String(key.value)
}

function isPlainValue(value: unknown): boolean {
  return value === null
    || typeof value === 'boolean'
    || (typeof value === 'number' && Number.isFinite(value))
    || (typeof value === 'string' && !TOKEN_RE.test(value))
}

function decodeProperties(node: any, decodeValue: (key: string, value: any) => unknown): unknown {
  const out: Record<string, unknown> = {}
  for (const prop of node.properties) {
    const key = prop.type === 'Property' && prop.kind === 'init' && !prop.method && !prop.computed ? staticKey(prop.key) : undefined
    if (key === undefined || UNSAFE_KEYS.has(key) || TOKEN_RE.test(key))
      return BAIL
    const value = decodeValue(key, prop.value)
    if (value === BAIL)
      return BAIL
    out[key] = value
  }
  return out
}

function decodeElements(node: any, decodeElement: (element: any) => unknown): unknown {
  const out: unknown[] = []
  for (const element of node.elements) {
    const value = !element || element.type === 'SpreadElement' ? BAIL : decodeElement(element)
    if (value === BAIL)
      return BAIL
    out.push(value)
  }
  return out
}

/** The value of a literal, or `BAIL` for anything that runs code. */
function decodeStatic(node: any): unknown {
  node = unwrap(node)
  switch (node?.type) {
    case 'Literal':
      return node.regex || node.bigint || !isPlainValue(node.value) ? BAIL : node.value
    case 'TemplateLiteral': {
      const cooked = node.quasis[0]?.value.cooked
      return node.expressions.length || !isPlainValue(cooked) ? BAIL : cooked
    }
    case 'UnaryExpression': {
      const value = node.argument.type === 'Literal' && node.argument.value
      return (node.operator === '-' || node.operator === '+') && typeof value === 'number' && Number.isFinite(value)
        ? (node.operator === '-' ? -value : value)
        : BAIL
    }
    case 'ArrayExpression':
      return decodeElements(node, decodeStatic)
    case 'ObjectExpression':
      return decodeProperties(node, (_, value) => decodeStatic(value))
  }
  return BAIL
}

/** A literal, or a value that the call evaluates where it stands. */
function decodeLeaf(node: any, values: any[]): unknown {
  const value = decodeStatic(node)
  if (value !== BAIL)
    return value
  const inner = unwrap(node)
  // a literal that is not plain JSON stays loose, and a parser that drops
  // parentheses would split a sequence into two values
  if (inner.type === 'Literal' || (inner.type === 'TemplateLiteral' && !inner.expressions.length) || node.type === 'SequenceExpression')
    return BAIL
  return dynamicValue(values.push(node) - 1)
}

// A tag list or a single tag. Its structure must be literal: a dynamic value
// here could add or remove tags.
function decodeTags(node: any, values: any[]): unknown {
  const inner = unwrap(node)
  if (inner.type === 'ArrayExpression')
    return decodeElements(inner, element => decodeTag(element, values))
  return decodeTag(inner, values)
}

function decodeTag(node: any, values: any[]): unknown {
  const inner = unwrap(node)
  return inner.type === 'ObjectExpression'
    ? decodeProperties(inner, (_, value) => decodeLeaf(value, values))
    : decodeStatic(inner)
}

function decodeHeadInput(node: any, values: any[]): unknown {
  return decodeProperties(node, (key, value) => key === 'title' || key === 'titleTemplate'
    ? decodeLeaf(value, values)
    : decodeTags(value, values))
}

// Any flat meta key takes a value, including the keys `unpackMeta` also expands from an
// object or a list: a string makes one tag, as v3 makes it, and `useCompiledSeoMeta` takes
// the v3 input for any other value. A value written as an object or a list is never
// text, so it must be static.
function decodeSeoInput(node: any, values: any[]): unknown {
  return decodeProperties(node, (key, value) => ENTRY_SEO_KEYS.has(key)
    ? BAIL
    : SHAPE_NODES.has(unwrap(value)?.type)
      ? decodeStatic(value)
      : decodeLeaf(value, values))
}

// What v3 makes of `useSeoMeta` input: `useSeoMeta` moves every key but the title
// ones to a `_flatMeta` tag, normalize runs over that tag, and `FlatMetaPlugin`
// unpacks it to meta without normalizing again. Compiled tags normalize each meta, so
// it must come out of that unchanged.
function seoToHeadInput(decoded: Record<string, unknown>): unknown {
  const { title, titleTemplate, ...flat } = decoded
  const meta = unpackMeta(normalizeProps({ tag: '_flatMeta', props: {} } as any, flat).props as any)
  for (const props of meta) {
    if (JSON.stringify(normalizeProps({ tag: 'meta', props: {} } as any, props as any).props) !== JSON.stringify(props))
      return BAIL
  }
  return { title, titleTemplate, meta }
}

function isHeadOnly(node: any): boolean {
  const inner = unwrap(node)
  const prop = inner.type === 'ObjectExpression' && inner.properties.length === 1 && inner.properties[0]
  return !!prop && prop.type === 'Property' && prop.kind === 'init' && !prop.computed && !prop.method && staticKey(prop.key) === 'head'
}

/**
 * Compiles one head call to compiled tags, or returns why it stays loose. Values are the
 * nodes of its dynamic leaves, in source order.
 */
function compileHeadCall(node: any, kind: HeadKind): CompiledCall {
  const [arg, options, ...rest] = node.arguments
  const input = unwrap(arg)
  if (input?.type !== 'ObjectExpression')
    return bail('input is not an object literal')
  if (rest.length || (options && !isHeadOnly(options)))
    return bail('options other than head')
  const values: any[] = []
  const decoded = kind === 'seo' ? decodeSeoInput(input, values) : decodeHeadInput(input, values)
  if (decoded === BAIL)
    return bail('input is not static where it must be')
  let headInput = decoded
  if (kind === 'seo') {
    try {
      headInput = seoToHeadInput(decoded as Record<string, unknown>)
    }
    catch (error) {
      // v3 throws on this input when it renders, so it stays loose and throws there
      return bail(`unpackMeta rejects the input: ${(error as Error).message}`)
    }
    if (headInput === BAIL)
      return bail('a flat meta value that v3 does not normalize')
  }
  const result = compileTags(headInput, { dynamicValues: values.length })
  if (result._tag === 'Bail')
    return result
  if (kind === 'seo' && values.length) {
    // the input v3 `useSeoMeta` pushes, rebuilt from the values
    const { title, titleTemplate, ...flat } = decoded as Record<string, unknown>
    const loose = JSON.stringify({ title, titleTemplate, _flatMeta: flat }).replace(DYNAMIC_VALUE_JSON_RE, 'f[$1]')
    return { _tag: 'Ok', tags: result.tags, values, loose: `f => (${loose})` }
  }
  return { _tag: 'Ok', tags: result.tags, values }
}

// Compiled tags must exist before any statement runs a head call, so they go after the
// leading directives and imports, before the first other statement.
function insertAfterImports(s: MagicString, body: any[], text: string): void {
  let end = 0
  for (const statement of body) {
    if (statement.type !== 'ImportDeclaration' && !(statement.type === 'ExpressionStatement' && statement.directive))
      break
    end = statement.end
  }
  if (end)
    s.appendLeft(end, `\n${text}`)
  else
    s.appendLeft(body[0].start, `${text}\n`)
}

/**
 * Compiles `useHead` and `useSeoMeta` calls of `@unhead/vue` with static structure
 * to compiled tags that `useCompiledHead` pushes. A call that cannot compile stays as written.
 */
export const CompileTransform = createUnplugin<CompileTransformOptions, false>((options: CompileTransformOptions = {}) => {
  const importPaths = new Set(options.importPaths)

  function shouldTransformId(id: string): boolean {
    const { pathname, query } = splitTransformId(id)
    if (NODE_MODULES_RE.test(pathname) || COMMONJS_RE.test(pathname))
      return false
    if (options.filter?.exclude?.some(pattern => id.match(pattern)))
      return false
    if (options.filter?.include?.some(pattern => id.match(pattern)))
      return true
    return isVueScriptRequest(pathname, query) || JS_EXT_RE.test(pathname)
  }

  return {
    name: 'unhead:compile-transform',
    enforce: 'post',

    transform: {
      filter: {
        code: HEAD_CALL_RE,
        id: createJsVueTransformIdFilter(options.filter?.include),
      },
      handler(code, id) {
        // Server and client builds both compile: the compiled server head and the lazy
        // client head take the same compiled tags.
        if (!shouldTransformId(id))
          return

        const scopeTracker = new ScopeTracker({ preserveExitedScopes: true })
        let ast: ReturnType<typeof parseAndWalkSource>
        try {
          ast = parseAndWalkSource(code, id, { scopeTracker })
        }
        catch (error) {
          if (isMissingParserError(error))
            throw error
          // Invalid source is left unchanged for the bundler's parser to report.
          return
        }
        if (ast.errors.length)
          return
        scopeTracker.freeze()

        // no identifier of the module starts with this, so no local name can shadow ours
        let prefix = '__unhead_'
        while (code.includes(prefix))
          prefix += '_'
        const s = new MagicString(code)
        const compiledTagSets = new Map<string, string>()
        const hoisted: string[] = []
        const runtime = new Set<string>()

        function hoist(value: string, map?: Map<string, string>): string {
          let name = map?.get(value)
          if (!name) {
            name = `${prefix}${hoisted.length}`
            hoisted.push(`const ${name} = ${value};`)
            map?.set(value, name)
          }
          return name
        }

        // An import of `@unhead/vue` or an import path, `undefined` for a name that
        // nothing declares, as an auto import leaves it, and `false` for anything else.
        function bindingOf(name: string): { source: string, imported: string } | false | undefined {
          const decl = scopeTracker.getDeclaration(name)
          if (!decl)
            return
          return decl instanceof ScopeTrackerImport
            && decl.node.type === 'ImportSpecifier'
            && decl.node.imported.type === 'Identifier'
            && (decl.importNode.source.value === '@unhead/vue' || importPaths.has(decl.importNode.source.value))
            && { source: decl.importNode.source.value, imported: decl.node.imported.name }
        }

        function resolveCallee(callee: any): { kind: HeadKind, resolvesHead: boolean } | undefined {
          const binding = callee.type === 'Identifier' && bindingOf(callee.name)
          if (binding === false)
            return
          const kind = CALLEES.get(binding ? binding.imported : callee.name)
          return kind && { kind, resolvesHead: binding?.source === '@unhead/vue' }
        }

        walk(ast.program, {
          scopeTracker,
          enter(node: any, parent: any) {
            if (node.type !== 'CallExpression' || node.optional)
              return
            const callee = resolveCallee(node.callee)
            if (!callee)
              return
            const [arg, options] = node.arguments
            const autoHead = !callee.resolvesHead && !options
            // a returned useSeoMeta entry patches flat input, which a compiled entry does not take
            // another `injectHead` in scope would take the place of the auto import
            const injectHead = autoHead ? bindingOf('injectHead') : undefined
            if ((callee.kind === 'seo' && parent?.type !== 'ExpressionStatement') || injectHead === false || (injectHead && injectHead.imported !== 'injectHead'))
              return
            const result = compileHeadCall(node, callee.kind)
            if (result._tag === 'Bail')
              return

            const fn = result.loose ? 'useCompiledSeoMeta' : 'useCompiledHead'
            runtime.add(fn)
            const head = [hoist(JSON.stringify(result.tags), compiledTagSets)]
            if (result.loose)
              head.push(hoist(result.loose))
            const tail = autoHead ? `, ${result.values.length ? '' : 'undefined, '}${AUTO_HEAD}` : options && !result.values.length ? ', undefined' : ''
            s.overwrite(node.callee.start, node.callee.end, `${prefix}${fn}`)
            // Values keep their source text and position, so they evaluate once, in
            // order, and a head call nested in a value compiles on its own.
            let start = arg.start
            let text = result.values.length ? `${head.join(', ')}, [` : head.join(', ')
            for (const valueNode of result.values) {
              s.overwrite(start, valueNode.start, text)
              start = valueNode.end
              text = ', '
            }
            s.overwrite(start, arg.end, `${result.values.length ? ']' : text}${tail}`)
          },
        })

        if (!runtime.size)
          return
        const specifiers = [...runtime].map(fn => `${fn} as ${prefix}${fn}`).join(', ')
        insertAfterImports(s, ast.program.body, `import { ${specifiers} } from '${RUNTIME}';\n${hoisted.join('\n')}`)
        return {
          code: s.toString(),
          map: s.generateMap({ includeContent: true, source: id }) as SourceMapInput,
        }
      },
    },
    vite: {
      sharedDuringBuild: true,
      // The dev server keeps its loose head calls, so it needs no compiled head.
      apply: (_config: UserConfig, env: ConfigEnv) => env.command !== 'serve',
    },
  }
})
