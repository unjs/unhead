import type { SourceMapInput } from 'rollup'
import type { CompiledTag, CompiledTags } from 'unhead/compiled'
import type { HeadTag } from 'unhead/types'
import type { ConfigEnv, UserConfig } from 'vite'
import type { BaseTransformerTypes } from './types'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import MagicString from 'magic-string'
import { isReferenceIdentifier, ScopeTracker, ScopeTrackerImport, walk } from 'oxc-walker'
import { compileTags, dynamicValue, readEntry } from 'unhead/compiled'
import { dedupeKey, normalizeEntryToTags, normalizeProps, TagConfigKeys, unpackMeta } from 'unhead/utils'
import { createUnplugin } from 'unplugin'
import { isMissingParserError, parseAndWalkSource } from './parser'
import { isVueScriptRequest, JS_EXT_RE, JS_VUE_RE, NODE_MODULES_RE, splitTransformId } from './utils'

const HEAD_CALL_RE = /\buse(?:Server)?(?:Head|SeoMeta)\b/
// A head call, or an import that may create a head that cannot take compiled tags
const TRANSFORM_CODE_RE = /\buse(?:Server)?(?:Head|SeoMeta)\b|['"](?:@unhead\/vue\/|unhead\/)(?:stream\/)?(?:server|client)['"]|['"]vite-ssg\b/
// The full runtime entries, whose `createHead` makes a head that cannot take compiled tags
const V3_HEAD_SOURCES = new Set(['@unhead/vue/server', '@unhead/vue/client', 'unhead/server', 'unhead/client'])
// The streaming entries, whose `createStreamableHead` makes such a head too
const STREAM_HEAD_SOURCES = new Set(['@unhead/vue/stream/server', '@unhead/vue/stream/client', 'unhead/stream/server', 'unhead/stream/client'])
// The plugins of a build that streams the head: Nuxt `experimental.ssrStreaming`, and the
// `streaming` option of the Unhead plugin
const STREAMING_PLUGIN_RE = /^(?:nuxt:streaming-iife-chunk|(?:@unhead\/[\w-]+|unhead):streaming)$/
// Frameworks that create such a head themselves
const V3_HEAD_FRAMEWORKS = ['vite-ssg']
const COMMONJS_RE = /\.c[jt]s$/
const TOKEN_RE = /[]/
const DYNAMIC_VALUE_JSON_RE = /"(\d+)"/g

const RUNTIME = '@unhead/vue/compiled'
const WHOLE_DYNAMIC_VALUE_RE = /^\uE000\d+\uE001$/
// the compiled tag flags of `unhead/compiled`
const FLAG_DYNAMIC_VALUES = 4
const FLAG_UNDEFINED_DROPS = 8
const FLAG_STRING_VALUES = 16
// a head call that takes a single name, such as `useHead(headData)`
const IDENTIFIER_INPUT_RE = /\buse(?:Server)?(?:Head|SeoMeta)\(\s*[\w$]+\s*[,)]/
// The runtime files of a Nuxt module, which call head composables as app code does
const MODULE_RUNTIME_RE = /[\\/]dist[\\/]runtime[\\/]/
// Nuxt's import paths of `useHead` and `injectHead`
const NUXT_IMPORT_PATHS = ['#imports', 'nuxt/app']
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
   * `#imports` and `nuxt/app` always count.
   */
  importPaths?: string[]
}

type CompiledCall
  = | { _tag: 'Ok', tags: CompiledTags, values: any[], loose?: string }
    | { _tag: 'Bail', reason: string }

/** A head call whose input holds one conditional: compiled tags for each branch, which the test selects. */
interface CompiledBranches { test: any, branches: [{ tags: CompiledTags, values: any[] }, { tags: CompiledTags, values: any[] }] }

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

// An object or a list of a flat meta value, with a value at each leaf
function decodeShape(node: any, values: any[]): unknown {
  const inner = unwrap(node)
  return inner?.type === 'ArrayExpression'
    ? decodeElements(inner, element => decodeShape(element, values))
    : inner?.type === 'ObjectExpression'
      ? decodeProperties(inner, (_, value) => decodeShape(value, values))
      : decodeLeaf(node, values)
}

// Any flat meta key takes a value, including the keys `unpackMeta` also expands from an
// object or a list: a string makes one tag, as v3 makes it, and `useCompiledSeoMeta` takes
// the v3 input for any other value. A value written as an object or a list is never
// text. Its shape is static, and with `shapeValues` its leaves may be values.
function decodeSeoInput(node: any, values: any[], shapeValues: boolean): unknown {
  return decodeProperties(node, (key, value) => ENTRY_SEO_KEYS.has(key)
    ? BAIL
    : SHAPE_NODES.has(unwrap(value)?.type)
      ? shapeValues ? decodeShape(value, values) : decodeStatic(value)
      : decodeLeaf(value, values))
}

// Replaces each dynamic value of decoded input: a whole value keeps its type, as in v3
function applyValues(value: unknown, values: readonly unknown[]): unknown {
  if (typeof value === 'string')
    return WHOLE_DYNAMIC_VALUE_RE.test(value) ? values[+value.slice(1, -1)] : value
  if (Array.isArray(value))
    return value.map(item => applyValues(item, values))
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, applyValues(item, values)]))
  return value
}

// The tags as they render and dedupe: a tag that sanitize drops counts only when it can hide another
function fingerprint(tags: HeadTag[]): string {
  return JSON.stringify(tags.map(tag => [tag.tag, dedupeKey(tag), Object.entries(tag.props).map(([key, value]) => [key, value == null ? value : String(value)]), tag.textContent ?? null])
    .filter(([name, key, props, content]) => key || content != null || (props as unknown[]).length || name === 'title'))
}

// The tags v3 `useSeoMeta` makes of decoded input with these values: `FlatMetaPlugin` adds
// the meta of the flat keys after the title tags, with no second normalize
function seoTags(decoded: Record<string, unknown>, values: readonly unknown[]): HeadTag[] {
  const { title, titleTemplate, ...flat } = applyValues(decoded, values) as Record<string, unknown>
  const tags = normalizeEntryToTags({ title, titleTemplate }, [])
  for (const props of unpackMeta(normalizeProps({ tag: '_flatMeta', props: {} } as any, flat).props as any))
    tags.push({ tag: 'meta', props } as unknown as HeadTag)
  return tags
}

function holdsValue(tag: CompiledTag, index: number): boolean {
  return !!(tag[5]! & FLAG_DYNAMIC_VALUES) && JSON.stringify(tag).includes(dynamicValue(index))
}

// `readEntry` reads compiled tags without its head, so any head will do
const READ_HEAD = { resolvedOptions: {}, plugins: new Map() } as any

// String and number values a flat meta value may hold on the compiled tags
const SEO_STRING_PROBES: unknown[] = ['x', 'a b']
const SEO_NUMBER_PROBES: unknown[] = [0, 7]

/**
 * Proves the compiled tags of a `useSeoMeta` call against v3 for each value at each place.
 * It marks the tags of a value that v3 renders by other rules when it is a number, and the
 * tags of a value whose `undefined` makes no tag in v3, as for a flat meta key. Returns false
 * when a string value would render other tags.
 */
function proveSeoTags(decoded: Record<string, unknown>, tags: CompiledTag[], count: number): boolean {
  const vector = (index: number, probe: unknown) => Array.from({ length: count }, (_, i) => i === index ? probe : `v${i}`)
  // v3 throws on some values, such as `undefined` in a list, and the v3 input throws there too
  const v3 = (values: unknown[]) => {
    try {
      return fingerprint(seoTags(decoded, values))
    }
    catch {
      return 'throws'
    }
  }
  // an entry of compiled tags reads as the input v3 would normalize, with no head state
  const same = (values: unknown[]) => v3(values) === fingerprint(normalizeEntryToTags(readEntry({ input: tags, options: { values } } as any, READ_HEAD).input, []))
  for (let index = 0; index < count; index++) {
    if (!SEO_STRING_PROBES.every(probe => same(vector(index, probe))))
      return false
    const held = tags.filter(tag => holdsValue(tag, index)) as unknown as number[][]
    const numbers = SEO_NUMBER_PROBES.every(probe => same(vector(index, probe))) ? 0 : FLAG_STRING_VALUES
    const flags = held.map(tag => tag[5]! | numbers)
    held.forEach(tag => tag[5] = tag[5]! | FLAG_UNDEFINED_DROPS)
    if (!same(vector(index, undefined)))
      held.forEach((tag, i) => tag[5] = flags[i]!)
    else
      held.forEach((tag, i) => tag[5] = flags[i]! | FLAG_UNDEFINED_DROPS)
  }
  return true
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

function isFunctionNode(node: any): boolean {
  const inner = unwrap(node)
  return inner?.type === 'ArrowFunctionExpression' || inner?.type === 'FunctionExpression'
}

const FUNCTION_NODES = new Set(['ArrowFunctionExpression', 'FunctionExpression', 'FunctionDeclaration'])

// An object literal, or a conditional that picks one of two
function isObjectShape(node: any): boolean {
  return node?.type === 'ObjectExpression'
    || (node?.type === 'ConditionalExpression' && unwrap(node.consequent)?.type === 'ObjectExpression' && unwrap(node.alternate)?.type === 'ObjectExpression')
}

/**
 * The one conditional of a `useHead` input whose branches have a static shape: the whole input,
 * or the value of a key. Each branch replaces it in a copy of the input. Values before it would
 * run before its test in v3, so they keep the input loose.
 */
function inputBranches(input: any): { test: any, branches: [any, any] } | undefined {
  if (input.type === 'ConditionalExpression')
    return { test: input.test, branches: [unwrap(input.consequent), unwrap(input.alternate)] }
  const prop = input.properties.find((prop: any) => prop.type === 'Property' && !prop.computed && unwrap(prop.value)?.type === 'ConditionalExpression'
    && staticKey(prop.key) !== 'title' && staticKey(prop.key) !== 'titleTemplate')
  if (!prop)
    return
  const conditional = unwrap(prop.value)
  const branch = (value: any) => ({ ...input, properties: input.properties.map((p: any) => p === prop ? { ...p, value } : p) })
  return { test: conditional.test, branches: [branch(conditional.consequent), branch(conditional.alternate)] }
}

/**
 * The object literal that a getter input returns, so the getter can return its values
 * instead. The getter takes no parameters and returns that object as its last statement,
 * and only there, so every call returns the same shape.
 */
function getterObject(node: any): { object: any, block: boolean } | undefined {
  const fn = unwrap(node)
  if (!isFunctionNode(fn) || fn.async || fn.generator || fn.params.length)
    return
  if (fn.body.type !== 'BlockStatement') {
    const object = unwrap(fn.body)
    return isObjectShape(object) ? { object, block: false } : undefined
  }
  const statements = fn.body.body
  const last = statements.at(-1)
  const object = last?.type === 'ReturnStatement' && unwrap(last.argument)
  if (!isObjectShape(object))
    return
  let returns = false
  for (const statement of statements.slice(0, -1)) {
    walk(statement, {
      enter(child: any) {
        if (FUNCTION_NODES.has(child.type))
          this.skip()
        else if (child.type === 'ReturnStatement')
          returns = true
      },
    })
  }
  return returns ? undefined : { object, block: true }
}

// v3 calls a function `titleTemplate`, which compiled tags cannot hold
function hasFunctionTitleTemplate(input: any): boolean {
  return input?.type === 'ObjectExpression' && input.properties.some((prop: any) => prop.type === 'Property' && !prop.computed && staticKey(prop.key) === 'titleTemplate' && isFunctionNode(prop.value))
}

// The static rel of the first link with no key and a dynamic href, which a key would compile
function keylessLinkRel(input: any): string | undefined {
  const prop = input?.type === 'ObjectExpression' && input.properties.find((p: any) => p.type === 'Property' && !p.computed && staticKey(p.key) === 'link')
  const links = prop && unwrap(prop.value)
  for (const link of links?.type === 'ArrayExpression' ? links.elements : [links]) {
    const props = unwrap(link)?.type === 'ObjectExpression' ? unwrap(link).properties : []
    const value = (name: string) => props.find((p: any) => p.type === 'Property' && !p.computed && staticKey(p.key) === name)?.value
    const rel = decodeStatic(value('rel'))
    if (typeof rel === 'string' && !value('key') && value('href') && decodeStatic(value('href')) === BAIL)
      return rel
  }
}

// The member path of each leaf of an object literal, so a value reads the object at the call
function leafPaths(node: any, path: string, out: Map<any, string>): Map<any, string> {
  const inner = unwrap(node)
  if (inner?.type === 'ObjectExpression') {
    for (const prop of inner.properties) {
      const key = prop.type === 'Property' && !prop.computed && staticKey(prop.key)
      if (key !== undefined && key !== false)
        leafPaths(prop.value, out.set(prop.value, `${path}[${JSON.stringify(key)}]`).get(prop.value)!, out)
    }
  }
  else if (inner?.type === 'ArrayExpression') {
    inner.elements.forEach((element: any, i: number) => element && leafPaths(element, out.set(element, `${path}[${i}]`).get(element)!, out))
  }
  return out
}

/**
 * Compiles one head call to compiled tags, or returns why it stays loose. Values are the
 * nodes of its dynamic leaves, in source order.
 */
function compileHeadCall(node: any, kind: HeadKind, input = unwrap(node.arguments[0])): CompiledCall {
  const [, options, ...rest] = node.arguments
  if (input?.type !== 'ObjectExpression')
    return bail('input is not an object literal')
  if (rest.length || (options && !isHeadOnly(options)))
    return bail('options other than head')
  if (kind === 'seo') {
    // a list or object with values at its leaves, else as written before
    const result = compileInput(input, kind, true)
    return result._tag === 'Ok' ? result : compileInput(input, kind, false)
  }
  return compileInput(input, kind, false)
}

/**
 * Compiles a `useHead` input that holds one conditional, at most one level deep, to compiled
 * tags for each branch. Returns why it stays loose when a branch does not compile.
 */
function compileBranches(node: any, input: any): CompiledBranches | { _tag: 'Bail', reason: string } {
  const [, options, ...rest] = node.arguments
  const found = (input?.type === 'ObjectExpression' || input?.type === 'ConditionalExpression') && inputBranches(input)
  if (!found)
    return bail('input is not an object literal') as { _tag: 'Bail', reason: string }
  if (rest.length || (options && !isHeadOnly(options)))
    return bail('options other than head') as { _tag: 'Bail', reason: string }
  const branches: any[] = []
  for (const branch of found.branches) {
    const result = branch.type === 'ObjectExpression' ? compileInput(branch, 'head', false) : bail('a branch is not an object literal')
    if (result._tag === 'Bail')
      return result
    if (result.values.some(value => value.start < found.test.start))
      return bail('a value runs before the conditional') as { _tag: 'Bail', reason: string }
    branches.push({ tags: result.tags, values: result.values })
  }
  return { test: found.test, branches: branches as CompiledBranches['branches'] }
}

function compileInput(input: any, kind: HeadKind, shapeValues: boolean): CompiledCall {
  const values: any[] = []
  const decoded = kind === 'seo' ? decodeSeoInput(input, values, shapeValues) : decodeHeadInput(input, values)
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
    const tags = JSON.parse(JSON.stringify(result.tags)) as CompiledTag[]
    if (!proveSeoTags(decoded as Record<string, unknown>, tags, values.length) && shapeValues)
      return bail('a value in a list or an object that v3 renders by other rules')
    // the input v3 `useSeoMeta` pushes, rebuilt from the values
    const { title, titleTemplate, ...flat } = decoded as Record<string, unknown>
    const loose = JSON.stringify({ title, titleTemplate, _flatMeta: flat }).replace(DYNAMIC_VALUE_JSON_RE, 'f[$1]')
    return { _tag: 'Ok', tags, values, loose: `f => (${loose})` }
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

const V3_HEAD_FIX = 'create the head with @unhead/vue/compiled/server and @unhead/vue/lazy'

function isV3HeadFramework(source: string): boolean {
  return V3_HEAD_FRAMEWORKS.some(name => source === name || source.startsWith(`${name}/`))
}

// The import through which a module creates a head that cannot take compiled tags
function v3HeadImport(body: any[]): string | undefined {
  for (const statement of body) {
    if (statement.type !== 'ImportDeclaration' || statement.importKind === 'type')
      continue
    const source = statement.source.value
    if (isV3HeadFramework(source))
      return source
    const creator = V3_HEAD_SOURCES.has(source) ? 'createHead' : STREAM_HEAD_SOURCES.has(source) ? 'createStreamableHead' : undefined
    if (creator && statement.specifiers.some((spec: any) => spec.type === 'ImportSpecifier' && spec.importKind !== 'type' && spec.imported.type === 'Identifier' && spec.imported.name === creator))
      return source
  }
}

// The framework in the app's package.json that creates such a head
function v3HeadDependency(root: string): string | undefined {
  let pkg: { dependencies?: object, devDependencies?: object }
  try {
    pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  }
  catch {
    // no readable package.json: the import scan still finds the framework
    return
  }
  return V3_HEAD_FRAMEWORKS.find(name => (pkg.dependencies && name in pkg.dependencies) || (pkg.devDependencies && name in pkg.devDependencies))
}

/**
 * Compiles `useHead` and `useSeoMeta` calls of `@unhead/vue` with static structure
 * to compiled tags that `useCompiledHead` pushes. A call that cannot compile stays as written.
 */
export const CompileTransform = createUnplugin<CompileTransformOptions, false>((options: CompileTransformOptions = {}, meta) => {
  const importPaths = new Set([...NUXT_IMPORT_PATHS, ...options.importPaths || []])
  // Only these bundlers let `resolveId` resolve the runtime from the app
  const resolvesFromApp = meta?.framework === 'vite' || meta?.framework === 'rollup' || meta?.framework === 'rolldown'
  // Set once the app creates a head that cannot take compiled tags. A compiled call on
  // that head throws, so the build compiles nothing more.
  let off: string | undefined
  let warned = false
  // modules compiled in each build environment, to find a head after they compiled
  const compiledIn = new Map<string, number>()

  function turnOff(cause: string): void {
    off ||= `[unhead] ${cause}, which creates a head that cannot take compiled tags. Compiler mode is off for this build. To use compiler mode, ${V3_HEAD_FIX}.`
  }

  // A dependency compiles when `filter.include` names it, or when it is the runtime of a
  // Nuxt module. Its calls compile only if they import a head composable.
  function shouldTransformId(id: string): boolean {
    const { pathname, query } = splitTransformId(id)
    if (COMMONJS_RE.test(pathname) || options.filter?.exclude?.some(pattern => id.match(pattern)))
      return false
    if (options.filter?.include?.some(pattern => id.match(pattern)))
      return true
    return (!NODE_MODULES_RE.test(pathname) || (resolvesFromApp && MODULE_RUNTIME_RE.test(pathname)))
      && (isVueScriptRequest(pathname, query) || JS_EXT_RE.test(pathname))
  }

  return {
    name: 'unhead:compile-transform',
    enforce: 'post',

    // A module in node_modules may not resolve `@unhead/vue` itself, so the app resolves it
    resolveId(id, importer) {
      if (resolvesFromApp && id === RUNTIME && importer && NODE_MODULES_RE.test(importer))
        return (this as unknown as { resolve: (id: string, importer?: string, options?: object) => Promise<unknown> }).resolve(id, undefined, { skipSelf: true }) as any
    },

    transform: {
      filter: {
        code: TRANSFORM_CODE_RE,
        id: { include: [JS_VUE_RE, ...options.filter?.include || []] },
      },
      handler(code, id) {
        // Server and client builds both compile: the compiled server head and the lazy
        // client head take the same compiled tags.
        if (off || !shouldTransformId(id))
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

        // only app code: a dependency that creates such a head, as Nuxt does, is the
        // integration's to replace
        const v3Head = !NODE_MODULES_RE.test(splitTransformId(id).pathname) && v3HeadImport(ast.program.body)
        if (v3Head) {
          const environment = (this as any)?.environment?.name ?? ''
          const compiled = compiledIn.get(environment)
          const cause = `${id} imports from ${v3Head}`
          if (compiled) {
            throw new Error(`[unhead] ${cause}, which creates a head that cannot take compiled tags. ${compiled} modules compiled before the build found it, and their head calls would throw. To fix the build, set compile: false, or ${V3_HEAD_FIX}.`)
          }
          turnOff(cause)
          warned = true
          ;(this as any)?.warn?.(off)
          return
        }
        if (!HEAD_CALL_RE.test(code))
          return
        scopeTracker.freeze()

        // How often each binding is read, so an input held in a const compiles only
        // when the head call is its one reader
        const reads = new Map<unknown, number>()
        if (IDENTIFIER_INPUT_RE.test(code)) {
          walk(ast.program, {
            scopeTracker,
            enter(node: any, parent: any) {
              const decl = node.type === 'Identifier' && isReferenceIdentifier(node, parent) && scopeTracker.getDeclaration(node.name)
              if (decl)
                reads.set(decl, (reads.get(decl) || 0) + 1)
            },
          })
        }

        // The object literal of a const that only this input reads
        function constInput(arg: any): any {
          const decl: any = arg?.type === 'Identifier' && scopeTracker.getDeclaration(arg.name)
          const declarator = decl?.type === 'Variable' && decl.variableNode.kind === 'const' && reads.get(decl) === 1
            && decl.variableNode.declarations.find((d: any) => d.id === decl.node)
          const init = declarator && unwrap(declarator.init)
          return init?.type === 'ObjectExpression' ? init : undefined
        }
        const warn = (message: string) => (this as any)?.warn?.(message)

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
            const held = constInput(arg)
            // v3 `useSeoMeta` reads no keys of a function, so only `useHead` takes a getter input
            const getter = !held && callee.kind === 'head' ? getterObject(arg) : undefined
            const input = held || getter?.object || unwrap(arg)
            const result = compileHeadCall(node, callee.kind, input)
            const branched = result._tag === 'Bail' && callee.kind === 'head' && !held ? compileBranches(node, input) : undefined
            if (branched && 'test' in branched) {
              // the branch index and values replace the input, so its test and values run once, in order
              const valueText = (branch: { values: any[] }, index: number) => `[${[index, ...branch.values.map(value => code.slice(value.start, value.end))].join(', ')}]`
              const text = `(${code.slice(branched.test.start, branched.test.end)}) ? ${valueText(branched.branches[0], 0)} : ${valueText(branched.branches[1], 1)}`
              // the replaced source must hold no other head call, which compiles on its own
              if (!HEAD_CALL_RE.test(text)) {
                runtime.add('useCompiledHead')
                const branches = hoist(JSON.stringify({ branches: branched.branches.map(branch => branch.tags) }), compiledTagSets)
                const tail = autoHead ? `, ${AUTO_HEAD}` : ''
                s.overwrite(node.callee.start, node.callee.end, `${prefix}useCompiledHead`)
                if (getter) {
                  s.prependLeft(arg.start, `${branches}, `)
                  s.overwrite(getter.object.start, getter.object.end, text)
                  s.appendLeft(arg.end, tail)
                }
                else {
                  s.overwrite(arg.start, arg.end, `${branches}, ${text}${tail}`)
                }
                return
              }
            }
            if (result._tag === 'Bail') {
              if (hasFunctionTitleTemplate(input))
                warn(`[unhead] ${id}: titleTemplate is a function, so this head call stays normal input and the client loads the full runtime. Use a string, such as '%s %separator %siteName'.`)
              const rel = !NODE_MODULES_RE.test(id) && result.reason === 'dynamic value in the identity of a link tag' && keylessLinkRel(input)
              if (rel)
                warn(`[unhead] ${id}: a link with no key takes its rel and href as its identity, and this href is a dynamic value. So this head call stays normal input and the client loads the full runtime. To compile it, add a key, such as key: '${rel}'.`)
              return
            }

            // a `useSeoMeta` call with no values takes no fallback and no values, and keeps its marker
            const fn = callee.kind === 'seo' ? result.loose ? 'useCompiledSeoMeta' : 'useStaticCompiledSeoMeta' : 'useCompiledHead'
            runtime.add(fn)
            const head = [hoist(JSON.stringify(result.tags), compiledTagSets)]
            if (result.loose)
              head.push(hoist(result.loose))
            // a getter that runs statements keeps them, so it stays the values argument
            const valuesGetter = getter && (getter.block || result.values.length)
            const hasValues = result.values.length || valuesGetter
            const valuesSlot = hasValues || fn === 'useStaticCompiledSeoMeta' ? '' : 'undefined'
            const tail = autoHead ? `, ${valuesSlot && `${valuesSlot}, `}${AUTO_HEAD}` : options && valuesSlot ? `, ${valuesSlot}` : ''
            s.overwrite(node.callee.start, node.callee.end, `${prefix}${fn}`)
            // A getter input returns its values in place of its object, so it still runs once
            // for each resolution and tracks as a whole, as v3 tracks it
            if (valuesGetter) {
              s.prependLeft(arg.start, `${head.join(', ')}, `)
              let start = getter.object.start
              let text = '['
              for (const valueNode of result.values) {
                s.overwrite(start, valueNode.start, text)
                start = valueNode.end
                text = ', '
              }
              s.overwrite(start, getter.object.end, result.values.length ? ']' : '[]')
              s.appendLeft(arg.end, tail)
              return
            }
            if (getter) {
              s.overwrite(arg.start, arg.end, `${head.join(', ')}${tail}`)
              return
            }
            // An input held in a const reads each value from the const at the call
            if (held) {
              const paths = leafPaths(held, arg.name, new Map())
              s.overwrite(arg.start, arg.end, `${head.join(', ')}${result.values.length ? `, [${result.values.map(value => paths.get(value)).join(', ')}]` : ''}${tail}`)
              return
            }
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
        const environment = (this as any)?.environment?.name ?? ''
        compiledIn.set(environment, (compiledIn.get(environment) || 0) + 1)
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
      // vite-ssg creates its head itself, so no app module imports the head entries. A build
      // that streams the head creates a streamable head, in a dependency such as Nuxt.
      configResolved(config) {
        const framework = v3HeadDependency(config.root)
        const streaming = config.plugins.find(plugin => STREAMING_PLUGIN_RE.test(plugin.name))
        if (framework)
          turnOff(`${join(config.root, 'package.json')} depends on ${framework}`)
        else if (streaming)
          turnOff(`the ${streaming.name} plugin streams the head`)
      },
      buildStart() {
        if (off && !warned) {
          warned = true
          this.warn(off)
        }
      },
      // The dev server keeps its loose head calls, so it needs no compiled head.
      apply: (_config: UserConfig, env: ConfigEnv) => env.command !== 'serve',
    },
  }
})
