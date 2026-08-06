import type { SourceMapInput } from 'rollup'
import type { Hole } from 'unhead/v4/emit'
import type { ConfigEnv, UserConfig } from 'vite'
import type { BaseTransformerTypes } from './types'
import type { BuildConsumer } from './utils'
import MagicString from 'magic-string'
import { ScopeTracker, ScopeTrackerImport, walk } from 'oxc-walker'
import { emitEntryPlan, hole, PlanEmitError, planToCode } from 'unhead/v4/emit'
import { createUnplugin } from 'unplugin'
import { parseAndWalkSource } from './parser'
import { createJsVueTransformIdFilter, isVueScriptRequest, NODE_MODULES_RE, resolveBuildConsumer, splitTransformId } from './utils'

const TRANSFORM_RE = /\.(?:(?:c|m)?j|t)sx?$/
const USE_HEAD_RE = /\buseHead\b/
const DEFAULT_IMPORT_PATHS = new Set(['@unhead/vue/v4/compiled'])
const LITERAL_TYPES = new Set(['Literal', 'StringLiteral', 'NumericLiteral', 'BooleanLiteral', 'NullLiteral'])
const DECODE_BAIL = Symbol('unhead:v4-plan-decode-bail')
// type annotations that erase to nothing at runtime; both the call-argument
// check and the decoder look through them to the real expression
const TS_WRAPPER_TYPES = new Set(['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression', 'TSInstantiationExpression', 'ParenthesizedExpression'])

// a value position may hold `hole()` (a value that varies but never changes
// tag/attribute structure); StaticValue widens to admit it so decode can
// return it inline instead of threading a parallel result type through
// every array/object branch
type StaticValue = string | number | boolean | null | Hole | StaticValue[] | { [key: string]: StaticValue }

/**
 * One `() => expr` getter found in a value position while decoding. `node`
 * is the arrow's body expression (not the arrow itself): its source span is
 * copied verbatim into the fills array literal at the original call site, so
 * it keeps referencing whatever component/setup scope it was written in.
 * Pushed in decode (= plan creation) order; `emitEntryPlan`'s `fillOrder`
 * maps each plan hole back to an index into this array.
 */
interface HoleSite {
  node: any
}

function unwrapType(node: any): any {
  while (node && TS_WRAPPER_TYPES.has(node.type)) node = node.expression
  return node
}

export interface V4PlanTransformOptions extends BaseTransformerTypes {
  /** Import paths whose named or namespace `useHead` export is trusted. */
  importPaths?: string[]
  /** Force a build target when the bundler cannot expose one. */
  consumer?: BuildConsumer
  /** Compile client plans and install their DOM renderer. @default false */
  client?: boolean
  /** Source for the client `injectHead` import, useful for virtual composables. */
  adapterImport?: string
  /**
   * Called once per trusted `useHead` call site (imported from a path in
   * `importPaths`/the default compiled path), reporting whether it compiled
   * to a plan or fell back to the runtime call. This is the primitive a
   * two-pass build uses to decide whether the whole app can safely switch
   * its root `createHead` import to the strict compiled profile: see
   * `canUseCompiledProfile`. Emission only, no import rewriting happens here.
   */
  reportEntry?: (info: { id: string, compiled: boolean }) => void
}

export interface CompiledProfileStats {
  /** Trusted `useHead` call sites seen (compiled or not). */
  trusted: number
  /** Trusted call sites that did not compile to a plan. */
  bailed: number
}

/**
 * Whether an app-wide build (aggregated `reportEntry` calls across every
 * transformed module) can safely swap its root `createHead` import from the
 * loose profile to the strict compiled one. Every trusted call site must
 * have compiled: a single bailed call still executes against whatever
 * `createHead` the app uses, and the strict compiled head throws on a loose
 * object (it has no L1 to fall back to), so this is a correctness gate, not
 * an optimization heuristic.
 */
export function canUseCompiledProfile(stats: CompiledProfileStats): boolean {
  return stats.trusted > 0 && stats.bailed === 0
}

interface ResolvedUseHead {
  adapterSource: string
}

interface PendingPlan extends ResolvedUseHead {
  code: string
  end: number
  name: string
  start: number
  /** `[expr1,expr2,...]` source, verbatim original spans, or undefined if the plan has no holes. */
  fillsExpr?: string
}

function getExportName(node: any): string | undefined {
  if (node?.type === 'Identifier')
    return node.name
  if ((node?.type === 'Literal' || node?.type === 'StringLiteral') && typeof node.value === 'string')
    return node.value
}

function getMemberName(node: any): string | undefined {
  if (node?.type !== 'MemberExpression')
    return
  if (!node.computed && node.property?.type === 'Identifier')
    return node.property.name
  if (node.computed && (node.property?.type === 'Literal' || node.property?.type === 'StringLiteral') && typeof node.property.value === 'string')
    return node.property.value
}

function getStaticPropertyKey(prop: any): string | undefined {
  if (prop.computed)
    return
  if (prop.key?.type === 'Identifier')
    return prop.key.name
  if ((prop.key?.type === 'Literal' || prop.key?.type === 'StringLiteral') && typeof prop.key.value === 'string')
    return prop.key.value
}

function isUnsafeObjectKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype'
}

/**
 * Decode syntax only. Source text is never evaluated.
 *
 * `holes` collects eligible `() => expr` getters found in value positions,
 * in encounter order; `emitEntryPlan`'s `fillOrder` later maps each plan
 * hole back to an index into this array. An arrow that fails eligibility
 * (params, block body, async, generator) is not a hole: it bails the whole
 * call to the runtime path, same as any other undecodable value, per
 * V4_DESIGN.md 15's "block statements, async, arguments: bail loose" rule.
 */
function decodeStaticValue(node: any, holes: HoleSite[]): StaticValue | typeof DECODE_BAIL {
  node = unwrapType(node)
  if (!node)
    return DECODE_BAIL
  if (node.type === 'ArrowFunctionExpression') {
    if (node.async || node.generator || node.params.length || node.body.type === 'BlockStatement')
      return DECODE_BAIL
    holes.push({ node: node.body })
    return hole()
  }
  if (LITERAL_TYPES.has(node.type)) {
    if (node.regex !== undefined || node.bigint !== undefined)
      return DECODE_BAIL
    const value = node.value
    return value === null
      || typeof value === 'string'
      || typeof value === 'boolean'
      || (typeof value === 'number' && Number.isFinite(value))
      ? value
      : DECODE_BAIL
  }
  if (node.type === 'UnaryExpression') {
    const arg = unwrapType(node.argument)
    if ((node.operator !== '-' && node.operator !== '+')
      || !arg
      || !LITERAL_TYPES.has(arg.type)
      || arg.regex !== undefined
      || arg.bigint !== undefined
      || typeof arg.value !== 'number'
      || !Number.isFinite(arg.value)) {
      return DECODE_BAIL
    }
    const value = node.operator === '-' ? -arg.value : arg.value
    return Object.is(value, -0) ? DECODE_BAIL : value
  }
  if (node.type === 'TemplateLiteral') {
    if (node.expressions.length)
      return DECODE_BAIL
    const cooked = node.quasis[0]?.value?.cooked
    return typeof cooked === 'string' ? cooked : DECODE_BAIL
  }
  if (node.type === 'ArrayExpression') {
    const out: StaticValue[] = []
    for (const element of node.elements) {
      if (!element || element.type === 'SpreadElement')
        return DECODE_BAIL
      const value = decodeStaticValue(element, holes)
      if (value === DECODE_BAIL)
        return DECODE_BAIL
      out.push(value)
    }
    return out
  }
  if (node.type === 'ObjectExpression') {
    const out: Record<string, StaticValue> = Object.create(null)
    for (const prop of node.properties) {
      if (prop.type === 'SpreadElement' || prop.computed || prop.method || prop.kind !== 'init')
        return DECODE_BAIL
      const key = getStaticPropertyKey(prop)
      if (!key || isUnsafeObjectKey(key))
        return DECODE_BAIL
      const value = decodeStaticValue(prop.value, holes)
      if (value === DECODE_BAIL)
        return DECODE_BAIL
      out[key] = value
    }
    return out
  }
  return DECODE_BAIL
}

function shouldTransformId(options: V4PlanTransformOptions, id: string): boolean {
  const { pathname, query } = splitTransformId(id)
  if (NODE_MODULES_RE.test(pathname))
    return false
  if (options.filter?.include?.some(pattern => id.match(pattern)))
    return true
  if (options.filter?.exclude?.some(pattern => id.match(pattern)))
    return false
  return isVueScriptRequest(pathname, query) || TRANSFORM_RE.test(pathname)
}

function insertionOffset(code: string, body: any[]): number {
  const directives = body.filter(node => node.type === 'ExpressionStatement' && node.directive)
  if (directives.length)
    return directives.at(-1).end
  return code.startsWith('#!') ? code.indexOf('\n') + 1 : 0
}

export const V4PlanTransform = createUnplugin<V4PlanTransformOptions, false>((options: V4PlanTransformOptions = {}) => {
  const trustedSources = new Set([...DEFAULT_IMPORT_PATHS, ...(options.importPaths || [])])
  let fallbackConsumer = options.consumer

  function resolveUseHead(callee: any, scopeTracker: ScopeTracker): ResolvedUseHead | undefined {
    if (callee.type === 'Identifier') {
      const declaration = scopeTracker.getDeclaration(callee.name)
      if (!(declaration instanceof ScopeTrackerImport)
        || declaration.node.type !== 'ImportSpecifier'
        || declaration.importNode.importKind === 'type'
        || declaration.node.importKind === 'type'
        || getExportName(declaration.node.imported) !== 'useHead'
        || !trustedSources.has(declaration.importNode.source.value)) {
        return
      }
      return { adapterSource: options.adapterImport || declaration.importNode.source.value }
    }

    if (getMemberName(callee) !== 'useHead' || callee.object?.type !== 'Identifier')
      return
    const declaration = scopeTracker.getDeclaration(callee.object.name)
    if (!(declaration instanceof ScopeTrackerImport)
      || declaration.node.type !== 'ImportNamespaceSpecifier'
      || declaration.importNode.importKind === 'type'
      || !trustedSources.has(declaration.importNode.source.value)) {
      return
    }
    return { adapterSource: options.adapterImport || declaration.importNode.source.value }
  }

  return {
    name: 'unhead:v4-plan-transform',
    enforce: 'post',
    transformInclude: id => shouldTransformId(options, id),
    transform: {
      filter: {
        code: USE_HEAD_RE,
        id: createJsVueTransformIdFilter(options.filter?.include),
      },
      handler(code, id) {
        const consumer = resolveBuildConsumer(this, fallbackConsumer)
        // The regular Vue client factory still contains L1. Keep browser
        // compilation explicit until a strict compiled createHead adapter can
        // remove it, otherwise adding client-plans is a bundle regression.
        if (!consumer || (consumer === 'client' && options.client !== true))
          return
        if (!shouldTransformId(options, id) || !USE_HEAD_RE.test(code))
          return

        const scopeTracker = new ScopeTracker({ preserveExitedScopes: true })
        const ast = parseAndWalkSource(code, id, { scopeTracker })
        scopeTracker.freeze()

        let prefix = '__unhead_v4'
        while (code.includes(prefix)) prefix += '_'
        const pending: PendingPlan[] = []

        walk(ast.program, {
          scopeTracker,
          enter(node: any) {
            if (node.type !== 'CallExpression' || node.arguments.length !== 1)
              return
            const resolved = resolveUseHead(node.callee, scopeTracker)
            if (!resolved)
              return
            const rawInputNode = node.arguments[0]
            // `as const` / `satisfies X` erase at runtime; decode the real
            // expression but replace the whole original span (annotation
            // included) with the compiled plan
            const inputNode = unwrapType(rawInputNode)
            if (inputNode?.type !== 'ObjectExpression') {
              options.reportEntry?.({ compiled: false, id })
              return
            }
            const holes: HoleSite[] = []
            const input = decodeStaticValue(inputNode, holes)
            if (input === DECODE_BAIL || Array.isArray(input) || input === null || typeof input !== 'object') {
              options.reportEntry?.({ compiled: false, id })
              return
            }

            let plan: ReturnType<typeof emitEntryPlan>
            try {
              plan = emitEntryPlan(input)
            }
            catch (error) {
              if (error instanceof PlanEmitError) {
                options.reportEntry?.({ compiled: false, id })
                return
              }
              throw error
            }
            // every `hole()` we minted must have reached the plan in the same
            // count: emitEntryPlan itself throws PlanEmitError (caught above)
            // for a hole a structural/identity position or the compiler drops,
            // so a mismatch here would mean a latent bug, not a legal shape.
            // Bail conservatively to the runtime path rather than emit a plan
            // with a fills array of the wrong length.
            if (plan.holes !== holes.length) {
              options.reportEntry?.({ compiled: false, id })
              return
            }
            options.reportEntry?.({ compiled: true, id })
            // getters must stay lexically at the call site (they close over
            // component/setup scope); only the structural plan hoists to
            // module scope. fillOrder is the identity permutation for entry
            // plans (no cross-entry dedupe), but it costs nothing to honor it.
            const fillsExpr = plan.holes
              ? `[${plan.fillOrder.map(i => code.slice(holes[i].node.start, holes[i].node.end)).join(',')}]`
              : undefined
            pending.push({
              ...resolved,
              code: planToCode(plan.plan),
              end: rawInputNode.end,
              name: `${prefix}_plan_${pending.length}`,
              start: rawInputNode.start,
              fillsExpr,
            })
          },
        })

        if (!pending.length)
          return

        const s = new MagicString(code)
        const imports: string[] = []
        const injectNames = new Map<string, string>()
        const installName = `${prefix}_install`
        if (consumer === 'client') {
          imports.push(`import { installPlanRenderer as ${installName} } from 'unhead/v4/client-plans'`)
          for (const item of pending) {
            if (!injectNames.has(item.adapterSource)) {
              const name = `${prefix}_inject${injectNames.size ? `_${injectNames.size}` : ''}`
              injectNames.set(item.adapterSource, name)
              imports.push(`import { injectHead as ${name} } from ${JSON.stringify(item.adapterSource)}`)
            }
          }
        }

        for (const item of pending) {
          const planRef = consumer === 'client'
            ? `(${installName}(${injectNames.get(item.adapterSource)}()),${item.name})`
            : item.name
          // the original call always had exactly one argument (the guard at
          // the top of the walker requires it); a hole-bearing plan grows
          // that single argument span into two args, plan then fills, so the
          // fills array literal (with its call-site-scoped expressions)
          // lands inside the same parens the user wrote
          const replacement = item.fillsExpr ? `${planRef}, { fills: () => ${item.fillsExpr} }` : planRef
          s.overwrite(item.start, item.end, replacement)
        }

        const declarations = pending.map(item => `const ${item.name} = ${item.code}`).join('\n')
        const generated = `${imports.length ? `${imports.join('\n')}\n` : ''}${declarations}\n`
        s.appendLeft(insertionOffset(code, ast.program.body), generated)
        return {
          code: s.toString(),
          map: s.generateMap({ includeContent: true, source: id }) as SourceMapInput,
        }
      },
    },
    webpack(ctx) {
      fallbackConsumer = options.consumer || (ctx.name === 'server' ? 'server' : 'client')
    },
    vite: {
      sharedDuringBuild: true,
      apply(_config: UserConfig, env: ConfigEnv) {
        fallbackConsumer = options.consumer || (env.isSsrBuild ? 'server' : 'client')
        return true
      },
    },
  }
})
