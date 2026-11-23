import type { ScopeTrackerNode } from 'oxc-walker'
import { ScopeTracker, ScopeTrackerImport, ScopeTrackerVariable, walk } from 'oxc-walker'
import { HasElementTags } from 'unhead/utils'
import { isMissingParserError, parseAndWalkSource } from './parser'

type Node = Parameters<typeof walk>[0]
type InputScope = 'head' | 'attributes'
type InputIndex = 0 | 1 | 'either'

const CORE_SOURCE_RE = /(?:^|\/)unhead(?:$|\/dist\/)/
const FRAMEWORK_SOURCE_RE = /(?:^|\/)@unhead\/[^/]+(?:$|\/dist\/)/
const NUXT_COMPOSABLES_RE = /(?:^|\/)nuxt\/dist\/(?:head\/runtime\/composables|app\/composables\/head)\.[cm]?[jt]s(?:$|\?)/
const EVENT_KEY_RE = /^on/i

function staticKey(node: Node, computed: boolean): string | undefined {
  if (node.type === 'Literal' && typeof node.value === 'string')
    return node.value
  if (!computed && node.type === 'Identifier')
    return node.name
  if (node.type === 'TemplateLiteral' && !node.expressions.length)
    return node.quasis[0]?.value.cooked ?? undefined
}

function inputIndex(source: string): InputIndex {
  if (CORE_SOURCE_RE.test(source))
    return 1
  if (FRAMEWORK_SOURCE_RE.test(source) || NUXT_COMPOSABLES_RE.test(source)
    || source === '#imports' || source === '#app' || source === '#app/composables/head' || source === 'nuxt/app') {
    return 0
  }
  // A vendor can re-export either version under the original name.
  return 'either'
}

export function collectHeadUsage(code: string, id: string): { domEvents: boolean, titleTemplate: boolean } | undefined {
  const usage = { domEvents: false, titleTemplate: false }
  if (!code.includes('useHead'))
    return usage

  const scopeTracker = new ScopeTracker({ preserveExitedScopes: true })
  let ast: ReturnType<typeof parseAndWalkSource>
  try {
    ast = parseAndWalkSource(code, id, { scopeTracker, parseOptions: { lang: 'js', preserveParens: false } })
  }
  catch (error) {
    if (isMissingParserError(error))
      return
    throw error
  }
  if (ast.errors.length)
    return

  scopeTracker.freeze()
  const bindings = new WeakMap<Node, ScopeTrackerNode>()
  const calls: Extract<Node, { type: 'CallExpression' }>[] = []
  walk(ast.program, {
    scopeTracker,
    enter(node) {
      if (node.type === 'Identifier') {
        const binding = scopeTracker.getDeclaration(node.name)
        if (binding)
          bindings.set(node, binding)
      }
      else if (node.type === 'CallExpression') {
        calls.push(node)
      }
    },
  })

  function resolveAlias(value: Node) {
    const seen = new Set<Node>()
    let node = value
    // Read bindings at their original references so a caller cannot shadow an
    // identifier inside an enclosing const's initializer.
    while (node.type === 'Identifier' && !seen.has(node)) {
      seen.add(node)
      const binding = bindings.get(node)
      if (!(binding instanceof ScopeTrackerVariable) || binding.variableNode.kind !== 'const')
        break
      const init = binding.variableNode.declarations.find(decl => decl.id === binding.node)?.init
      if (!init)
        break
      node = init
    }
    return node
  }

  function getHeadInputIndex(callee: Node): InputIndex | undefined {
    const node = resolveAlias(callee)
    if (node.type === 'Identifier') {
      const binding = bindings.get(node)
      if (!binding && node.name === 'useHead')
        return 0
      if (binding instanceof ScopeTrackerImport && binding.node.type === 'ImportSpecifier'
        && staticKey(binding.node.imported, false) === 'useHead') {
        return inputIndex(binding.importNode.source.value)
      }
    }
    else if (node.type === 'MemberExpression' && staticKey(node.property, node.computed) === 'useHead') {
      const binding = bindings.get(resolveAlias(node.object))
      if (binding instanceof ScopeTrackerImport && binding.node.type === 'ImportNamespaceSpecifier')
        return inputIndex(binding.importNode.source.value)
    }
  }

  const seen = { head: new Set<Node>(), attributes: new Set<Node>() }
  function inspect(value: Node | null, scope: InputScope) {
    if (!value || (usage.domEvents && usage.titleTemplate))
      return
    const node = resolveAlias(value)
    if (seen[scope].has(node))
      return
    seen[scope].add(node)

    switch (node.type) {
      case 'ObjectExpression':
        for (const prop of node.properties) {
          if (prop.type === 'SpreadElement') {
            inspect(prop.argument, scope)
            continue
          }
          const key = staticKey(prop.key, prop.computed)
          if (key === undefined)
            continue
          if (scope === 'attributes')
            usage.domEvents ||= EVENT_KEY_RE.test(key)
          else if (key === 'titleTemplate')
            usage.titleTemplate = true
          else if (key === 'htmlAttrs' || key === 'bodyAttrs' || HasElementTags.has(key))
            inspect(prop.value, 'attributes')
        }
        break
      case 'ArrayExpression':
        if (scope === 'attributes') {
          for (const element of node.elements)
            inspect(element, scope)
        }
        break
      case 'SpreadElement':
        inspect(node.argument, scope)
        break
      case 'ConditionalExpression':
        inspect(node.consequent, scope)
        inspect(node.alternate, scope)
        break
      case 'ArrowFunctionExpression':
      case 'FunctionExpression':
        if (!node.body)
          break
        if (node.body.type !== 'BlockStatement') {
          inspect(node.body, scope)
          break
        }
        walk(node.body, {
          enter(child) {
            // Nested functions do not return a value from this input.
            if (child.type === 'FunctionDeclaration' || child.type === 'FunctionExpression' || child.type === 'ArrowFunctionExpression')
              this.skip()
            else if (child.type === 'ReturnStatement')
              inspect(child.argument, scope)
          },
        })
        break
    }
  }

  function inspectArgument(argument: Node | undefined) {
    if (argument && argument.type !== 'SpreadElement')
      inspect(argument, 'head')
  }

  for (const call of calls) {
    const index = getHeadInputIndex(call.callee)
    if (index === 'either') {
      inspectArgument(call.arguments[0])
      inspectArgument(call.arguments[1])
    }
    else if (index !== undefined) {
      inspectArgument(call.arguments[index])
    }
  }
  return usage
}
