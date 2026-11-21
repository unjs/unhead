import type { walk } from 'oxc-walker'
import { readFile } from 'node:fs/promises'
import { isAbsolute, relative, sep } from 'node:path'
import { html, parse } from 'parse5'
import { isMissingParserError, parseAndWalkSource } from './parser'

export const buildFeatures = ['domEvents', 'titleTemplate'] as const
export type BuildFeature = typeof buildFeatures[number]
type FeatureStatus = 'used' | 'absent' | 'unknown'
type Binding = 'createHead' | 'useHead' | 'useScript' | 'head' | 'entry'
type Node = Parameters<typeof walk>[0]
type Expression = Extract<ReturnType<typeof parseAndWalkSource>['program']['body'][number], { type: 'ExpressionStatement' }>['expression']

const entries = new Map<string, ReadonlyMap<string, Binding>>([
  ['client.mjs', new Map([['createHead', 'createHead']])],
  ['index.mjs', new Map([['useHead', 'useHead'], ['useHeadSafe', 'useHead'], ['useSeoMeta', 'useHead'], ['useScript', 'useScript']])],
  ['scripts.mjs', new Map([['useScript', 'useScript']])],
])
const vitePreload = new Set(['\0vite/preload-helper.js', '\0vite/modulepreload-polyfill.js'])
// eslint-disable-next-line no-control-regex -- Browser URL parsing ignores leading C0 controls.
const executableUrl = /^[\s\u0000-\u001F]*javascript[\s\u0000-\u001F]*:/i
const remoteUrl = /^(?:[a-z][\w+.-]*:|\/\/)/i
const opaqueHtmlTags = new Set(['base', 'iframe', 'object', 'embed'])

export interface FeatureEvidence {
  features: Record<BuildFeature, FeatureStatus>
  reason?: string
}

export interface FeatureModule {
  code: string | null
  importedIds: string[]
  dynamicallyImportedIds: string[]
}

interface FeatureGraph {
  root: string
  canInspectHtml: boolean
  coreDirectories: ReadonlySet<string>
  getModule: (id: string) => FeatureModule | null
  resolveImport: (specifier: string, importer: string) => Promise<string | undefined>
}

export function isProjectModule(root: string, id: string): boolean {
  if (!isAbsolute(id))
    return false
  const path = relative(root, id)
  return !isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`) && !path.split(sep).includes('node_modules')
}

export function unknownFeatures(reason: string): FeatureEvidence {
  return { features: { domEvents: 'unknown', titleTemplate: 'unknown' }, reason }
}

async function inspectHtml(graph: FeatureGraph, id: string, module: FeatureModule): Promise<boolean> {
  const source = await readFile(id, 'utf8').catch(() => {
    // A virtual or unreadable HTML entry has no evidence of feature absence.
    return undefined
  })
  if (source === undefined)
    return false
  const nodes = [...parse(source).childNodes]
  while (nodes.length) {
    const node = nodes.pop()!
    if (!('tagName' in node))
      continue
    if (opaqueHtmlTags.has(node.tagName) || node.attrs.some(attr => attr.name.startsWith('on') || executableUrl.test(attr.value.replace(/[\t\r\n]/g, ''))))
      return false
    if (node.tagName === 'script') {
      const src = node.attrs.find(attr => attr.name === 'src')?.value.trim()
      const type = node.attrs.find(attr => attr.name === 'type')?.value.trim().toLowerCase()
      if (!src || type !== 'module' || remoteUrl.test(src) || node.namespaceURI !== html.NS.HTML)
        return false
      const specifier = src.startsWith('.') || src.startsWith('/') ? src : `./${src}`
      const target = await graph.resolveImport(specifier, id)
      if (!target || !module.importedIds.includes(target))
        return false
    }
    nodes.push(...node.childNodes)
  }
  return true
}

export async function collectFeatureEvidence(graph: FeatureGraph, roots: readonly string[]): Promise<FeatureEvidence> {
  const used = new Set<BuildFeature>()
  const analyzed = new Map<string, ReadonlyMap<string, Binding>>()
  const active = new Set<string>()
  let reason: string | undefined

  function fail(id: string, message: string): undefined {
    reason ??= `${message} in ${relative(graph.root, id)}`
    return undefined
  }

  function checkData(node: Node | null, depth = 0): boolean {
    if (!node)
      return false
    switch (node.type) {
      case 'Literal':
        return node.value === null || ['string', 'number', 'boolean'].includes(typeof node.value)
      case 'ArrayExpression':
        return node.elements.every(element => checkData(element, depth + 1))
      case 'ObjectExpression':
        for (const prop of node.properties) {
          if (prop.type !== 'Property' || prop.computed || prop.method || prop.shorthand || prop.kind !== 'init')
            return false
          const key = prop.key.type === 'Identifier' ? prop.key.name : prop.key.type === 'Literal' ? prop.key.value : undefined
          if (typeof key !== 'string' || key === '__proto__')
            return false
          if (!depth && key === 'titleTemplate')
            used.add('titleTemplate')
          const lower = key.toLowerCase()
          if (depth && lower.startsWith('on')) {
            used.add('domEvents')
            if (prop.value.type === 'Literal' && typeof prop.value.value === 'string')
              return false
          }
          if (lower === 'innerhtml' || (!depth && lower === 'script'))
            return false
          if (!checkData(prop.value, depth + 1))
            return false
        }
        return true
      case 'ArrowFunctionExpression':
        // An empty callback cannot introduce a feature through captured state.
        return !node.async && !node.params.length && node.body.type === 'BlockStatement' && !node.body.body.length
      default:
        return false
    }
  }

  function checkInit(arg: Node): boolean {
    if (arg.type !== 'ObjectExpression')
      return false
    return arg.properties.every(prop =>
      prop.type === 'Property' && !prop.computed && !prop.method && !prop.shorthand && prop.kind === 'init'
      && ((prop.key.type === 'Identifier' && prop.key.name === 'init') || (prop.key.type === 'Literal' && prop.key.value === 'init'))
      && prop.value.type === 'ArrayExpression' && prop.value.elements.every(element => checkData(element)),
    )
  }

  async function analyze(id: string): Promise<ReadonlyMap<string, Binding> | undefined> {
    const cached = analyzed.get(id)
    if (cached)
      return cached
    if (active.has(id))
      return fail(id, 'Cyclic imports')
    const module = graph.getModule(id)
    if (!isProjectModule(graph.root, id) || !module?.code)
      return fail(id, 'Unmodeled module')
    if (id.endsWith('.html') && (!graph.canInspectHtml || !await inspectHtml(graph, id, module)))
      return fail(id, 'Unmodeled HTML entry')

    active.add(id)
    const locals = new Map<string, Binding>()
    const exports = new Map<string, Binding>()
    const remaining = new Set([...module.importedIds, ...module.dynamicallyImportedIds])
    for (const id of vitePreload)
      remaining.delete(id)
    const dependencies = new Set([...module.importedIds, ...module.dynamicallyImportedIds])
    let ast: ReturnType<typeof parseAndWalkSource>
    try {
      ast = parseAndWalkSource(module.code, id, { parseOptions: { lang: 'js' } })
    }
    catch (error) {
      if (isMissingParserError(error))
        return fail(id, 'No parser available for')
      throw error
    }
    if (ast.errors.length)
      return fail(id, 'Unparsed module')

    async function resolveDependency(specifier: string) {
      const target = await graph.resolveImport(specifier, id)
      if (target && dependencies.has(target)) {
        remaining.delete(target)
        return target
      }
    }

    async function evaluate(node: Expression): Promise<Binding | true | undefined> {
      if (node.type === 'ImportExpression' && node.source.type === 'Literal' && typeof node.source.value === 'string' && !node.options) {
        const target = await resolveDependency(node.source.value)
        if (target && await analyze(target))
          return true
      }
      if (node.type !== 'CallExpression' || node.optional)
        return
      const callee = node.callee
      const args = node.arguments
      const [first, second] = args
      if (callee.type === 'Identifier') {
        const binding = locals.get(callee.name)
        if (binding === 'createHead' && (!args.length || (args.length === 1 && checkInit(first))))
          return 'head'
        if (first?.type === 'Identifier' && locals.get(first.name) === 'head') {
          if (binding === 'useHead' && args.length === 2 && checkData(second))
            return 'entry'
          if (binding === 'useScript')
            used.add('domEvents')
        }
      }
      if (callee.type === 'MemberExpression' && !callee.computed && !callee.optional && callee.object.type === 'Identifier' && callee.property.type === 'Identifier' && args.length === 1) {
        const receiver = locals.get(callee.object.name)
        if (receiver === 'head' && callee.property.name === 'push' && checkData(first))
          return 'entry'
        if (receiver === 'entry' && callee.property.name === 'patch' && checkData(first))
          return true
      }
    }

    for (const statement of ast.program.body) {
      if (statement.type === 'ImportDeclaration') {
        const specifier = statement.source.value
        const target = await resolveDependency(specifier)
        if (!target)
          return fail(id, 'Unresolved import')
        if (vitePreload.has(target) && !statement.specifiers.length)
          continue
        const sourceNames = (specifier === 'unhead' || specifier === 'unhead/client' || specifier === 'unhead/scripts')
          ? [...graph.coreDirectories]
              .map(directory => relative(directory, target))
              .map(path => entries.get(path))
              .find(Boolean)
          : await analyze(target)
        if (!sourceNames)
          return fail(id, 'Unmodeled import')
        for (const spec of statement.specifiers) {
          const binding = spec.type === 'ImportSpecifier' && sourceNames.get(spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value)
          if (!binding)
            return fail(id, 'Unmodeled imported binding')
          locals.set(spec.local.name, binding)
        }
        continue
      }
      const declaration = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement
      if (declaration?.type === 'VariableDeclaration' && declaration.kind === 'const') {
        for (const variable of declaration.declarations) {
          if (variable.id.type !== 'Identifier' || !variable.init)
            return fail(id, 'Unmodeled declaration')
          const binding = await evaluate(variable.init)
          if (typeof binding !== 'string')
            return fail(id, 'Unmodeled value')
          locals.set(variable.id.name, binding)
          if (statement.type === 'ExportNamedDeclaration')
            exports.set(variable.id.name, binding)
        }
        continue
      }
      if (statement.type === 'ExpressionStatement' && await evaluate(statement.expression))
        continue
      return fail(id, 'Unmodeled code')
    }
    if (remaining.size)
      return fail(id, 'Unmodeled dependency')
    active.delete(id)
    analyzed.set(id, exports)
    return exports
  }

  for (const root of roots) {
    if ((await analyze(root))?.size)
      fail(root, 'Exported head binding')
  }
  const status = (feature: BuildFeature): FeatureStatus => used.has(feature) ? 'used' : reason ? 'unknown' : 'absent'
  return { features: { domEvents: status('domEvents'), titleTemplate: status('titleTemplate') }, reason }
}
