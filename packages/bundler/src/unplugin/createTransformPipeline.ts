import type { SourceMapInput } from 'rollup'
import type { UnpluginOptions as UnpluginRawOptions } from 'unplugin'
import type { ConfigEnv, UserConfig } from 'vite'
import type { BaseTransformerTypes } from './types'
import type { BuildConsumer } from './utils'
import MagicString from 'magic-string'
import { parseSync } from 'oxc-parser'
import { ScopeTracker, ScopeTrackerImport, walk } from 'oxc-walker'
import {
  resolveMetaKeyType,
  resolveMetaKeyValue,
  resolvePackedMetaObjectValue,
} from 'unhead/utils'
import { createUnplugin } from 'unplugin'
import { createJsVueTransformIdFilter, isVueScriptRequest, NODE_MODULES_RE, resolveBuildConsumer, splitTransformId } from './utils'

/*
 * Internal unified single-parse transform pipeline.
 *
 * A module matching the treeshake, seoMeta and minify concerns used to be
 * parsed and walked three times (once per plugin). This module runs all three
 * concerns over one `parseSync` + one `ScopeTracker` walk + one `MagicString`,
 * preserving the per-plugin semantics exactly:
 *
 * - phase order per call site is load-bearing: server-composable removal runs
 *   first; a statement removed by treeshake (client build) is never
 *   seoMeta-rewritten or minified (previously guaranteed by plugin
 *   registration order, here enforced per node via claimed ranges)
 * - treeshake only applies when the resolved build consumer is `client`;
 *   unknown targets retain server code
 * - minification is async: pending minifications are collected during the
 *   walk and awaited afterwards
 *
 * Not exported from any public entry; the public plugin factories
 * (`TreeshakeServerComposables`, `UseSeoMetaTransform`, `MinifyTransform`)
 * are thin single-concern adapters over this pipeline.
 */

const TRANSFORM_RE = /\.(?:(?:c|m)?j|t)sx?$/
const SERVER_COMPOSABLE_RE = /\b(?:useServerHead|useServerHeadSafe|useServerSeoMeta|useSchemaOrg)\b/
const SEO_META_RE = /\buse(?:Server)?SeoMeta\b/
const HEAD_RE = /\buse(?:Server)?Head\b/

const SERVER_COMPOSABLE_NAMES = new Set([
  'useServerHead',
  'useServerHeadSafe',
  'useServerSeoMeta',
  // plugins
  'useSchemaOrg',
])

const SEO_META_NAMES = new Set(['useSeoMeta', 'useServerSeoMeta'])

// Keys whose runtime value is structurally expanded into multiple meta tags based on its shape
// (e.g. `ogImage: { url, width }` -> `og:image` + `og:image:width`). See `unpackMeta` MEDIA branch.
// We can only reproduce this statically for object/array literals; any dynamic value (ref, computed,
// getter, identifier) could resolve to an object and MUST be left to runtime `unpackMeta`.
const MEDIA_KEYS = new Set(['ogImage', 'ogVideo', 'ogAudio', 'twitterImage'])

const SKIP_JS_TYPES = new Set(['application/json', 'application/ld+json', 'speculationrules', 'importmap'])
const HEAD_FN_NAMES = new Set(['useHead', 'useServerHead'])
const CONTENT_PROP_NAMES = ['innerHTML', 'textContent']
const CONTENT_PROPS = new Set(CONTENT_PROP_NAMES)
const MINIFY_CACHE_MAX = 100

type TagType = 'script' | 'style'

interface PendingMinification {
  end: number
  minified: Promise<string | null>
  raw: string
  start: number
}

export type MinifyFn = (code: string) => Promise<string | null>

export interface TreeshakeServerComposablesOptions extends BaseTransformerTypes {
  /**
   * @deprecated Use `treeshake: false` at the top level instead.
   */
  enabled?: boolean
  /**
   * Extra import paths treated as unhead provenance when proving that a
   * server composable import may be removed (e.g. `#imports` for Nuxt).
   * When used inside the unified pipeline this defaults to the seoMeta
   * `importPaths` so provenance rules stay consistent across concerns.
   */
  importPaths?: string[]
}

export interface UseSeoMetaTransformOptions extends BaseTransformerTypes {
  /**
   * Whether to transform imports of `useSeoMeta` and `useServerSeoMeta` to `useHead` and `useServerHead`.
   */
  imports?: boolean
  /**
   * Extra import paths to consider where `useSeoMeta()` may be imported from.
   */
  importPaths?: string[]
}

export interface MinifyTransformOptions extends BaseTransformerTypes {
  /**
   * Custom JS minifier function, or `false` to disable JS minification.
   *
   * Use a subpath import to get a preconfigured minifier:
   * - `@unhead/bundler/minify/rolldown` (Vite 8+)
   * - `@unhead/bundler/minify/esbuild` (Vite 7)
   */
  js?: false | MinifyFn
  /**
   * Custom CSS minifier function, or `false` to disable CSS minification.
   *
   * Use `@unhead/bundler/minify/lightningcss` for a preconfigured minifier.
   */
  css?: false | MinifyFn
}

export interface TransformPipelineOptions {
  treeshake?: TreeshakeServerComposablesOptions | false
  seoMeta?: UseSeoMetaTransformOptions | false
  minify?: MinifyTransformOptions | false
}

interface TransformPipelineConfig extends TransformPipelineOptions {
  name: string
}

/**
 * A single text edit produced by one of the pipeline phases. Edits are
 * collected during the walk and applied to the MagicString at the end so
 * overlapping edits (a pipeline bug) can be detected before any output is
 * produced.
 */
interface PipelineEdit {
  start: number
  end: number
  /** `null` means remove the range (sourcemap-identical to `MagicString#remove`). */
  content: string | null
  phase: 'treeshake' | 'seoMeta' | 'minify'
}

function shouldTransformId(options: BaseTransformerTypes, id: string): boolean {
  const { pathname, query } = splitTransformId(id)

  if (NODE_MODULES_RE.test(pathname))
    return false

  // Included
  if (options.filter?.include?.some(pattern => id.match(pattern)))
    return true

  // Excluded
  if (options.filter?.exclude?.some(pattern => id.match(pattern)))
    return false

  // vue files
  if (isVueScriptRequest(pathname, query))
    return true

  // js files
  if (TRANSFORM_RE.test(pathname))
    return true

  return false
}

function applyEdits(s: MagicString, edits: PipelineEdit[], id: string): void {
  edits.sort((a, b) => a.start - b.start || a.end - b.end)
  for (let i = 1; i < edits.length; i++) {
    const prev = edits[i - 1]
    const cur = edits[i]
    if (cur.start < prev.end) {
      throw new Error(
        `[@unhead/bundler] conflicting transform edits in ${id}: `
        + `${prev.phase} edit [${prev.start}, ${prev.end}) overlaps ${cur.phase} edit [${cur.start}, ${cur.end}). `
        + `No output was produced for this module. This is a bug in @unhead/bundler, please report it.`,
      )
    }
  }
  for (const edit of edits) {
    if (edit.content === null)
      s.remove(edit.start, edit.end)
    else
      s.overwrite(edit.start, edit.end, edit.content)
  }
}

export function createTransformPipeline(config: TransformPipelineConfig): UnpluginRawOptions {
  const treeshakeOpts = config.treeshake === false ? undefined : config.treeshake
  const seoMetaOpts = config.seoMeta === false ? undefined : config.seoMeta
  const minifyOpts = config.minify === false ? undefined : config.minify

  // -- treeshake concern -----------------------------------------------------
  const treeshakeEnabled = !!treeshakeOpts && (treeshakeOpts.enabled ?? true)
  // Provenance for the treeshake unhead-import check. Defaults to the seoMeta
  // `importPaths` inside the unified pipeline so both concerns agree on what
  // counts as an unhead import.
  const treeshakeImportPaths = treeshakeOpts?.importPaths ?? seoMetaOpts?.importPaths
  const treeshakeExtraPaths = treeshakeImportPaths?.length ? new Set(treeshakeImportPaths) : undefined

  function isUnheadPackage(source: unknown): boolean {
    return typeof source === 'string'
      && (source === 'unhead' || source.startsWith('unhead/') || source.startsWith('@unhead/') || treeshakeExtraPaths?.has(source) === true)
  }

  // -- seoMeta concern -------------------------------------------------------
  const rewriteImports = seoMetaOpts ? (seoMetaOpts.imports ?? true) : true
  const seoMetaImportPaths = seoMetaOpts?.importPaths?.length ? new Set(seoMetaOpts.importPaths) : undefined

  function isValidSeoMetaPackage(s: string) {
    if (s === 'unhead' || s.startsWith('@unhead')) {
      return true
    }
    return seoMetaImportPaths?.has(s) === true
  }

  // -- minify concern --------------------------------------------------------
  const jsMinifier = minifyOpts && minifyOpts.js !== false ? minifyOpts.js : undefined
  const cssMinifier = minifyOpts && minifyOpts.css !== false ? minifyOpts.css : undefined
  const doJS = !!jsMinifier
  const doCSS = !!cssMinifier

  const minifyCache: Record<TagType, Map<string, Promise<string | null>>> = {
    script: new Map(),
    style: new Map(),
  }

  function minifyStringContent(content: string, tagType: TagType): Promise<string | null> {
    const minifier = tagType === 'script' ? jsMinifier : cssMinifier
    if (!minifier)
      return Promise.resolve(null)

    const cache = minifyCache[tagType]
    const cached = cache.get(content)
    if (cached) {
      cache.delete(content)
      cache.set(content, cached)
      return cached
    }

    const pending: Promise<string | null> = Promise.resolve()
      .then(() => minifier(content))
      .catch((error) => {
        if (cache.get(content) === pending)
          cache.delete(content)
        throw error
      })
    cache.set(content, pending)

    if (cache.size > MINIFY_CACHE_MAX) {
      const oldest = cache.keys().next().value
      if (oldest !== undefined)
        cache.delete(oldest)
    }

    return pending
  }

  function resolveHeadFunctionName(callee: any, scopeTracker: ScopeTracker): string | undefined {
    if (callee.type === 'Identifier') {
      const decl = scopeTracker.getDeclaration(callee.name)

      if (decl instanceof ScopeTrackerImport) {
        if (decl.node.type === 'ImportSpecifier'
          && decl.node.imported.type === 'Identifier'
          && HEAD_FN_NAMES.has(decl.node.imported.name)) {
          return decl.node.imported.name
        }
      }
      else if (!decl && HEAD_FN_NAMES.has(callee.name)) {
        return callee.name
      }
      return
    }

    if (callee.type !== 'MemberExpression'
      || callee.computed
      || callee.object.type !== 'Identifier'
      || callee.property.type !== 'Identifier'
      || !HEAD_FN_NAMES.has(callee.property.name)) {
      return
    }

    const decl = scopeTracker.getDeclaration(callee.object.name)
    if (decl instanceof ScopeTrackerImport && decl.node.type === 'ImportNamespaceSpecifier')
      return callee.property.name
  }

  function processScriptOrStyleObject(
    objectNode: any,
    tagType: TagType,
    pendingMinifications: PendingMinification[],
  ) {
    // for scripts, check if it's a skippable type
    if (tagType === 'script') {
      const typeProp = objectNode.properties.find(
        (p: any) => p.type === 'Property' && p.key?.type === 'Identifier' && p.key.name === 'type',
      )
      if (typeProp?.value?.type === 'Literal' && SKIP_JS_TYPES.has(typeProp.value.value))
        return
    }

    // find innerHTML or textContent property with a static string value
    for (const prop of objectNode.properties) {
      if (prop.type !== 'Property' || prop.key?.type !== 'Identifier')
        continue

      if (!CONTENT_PROPS.has(prop.key.name))
        continue

      // only handle static string literals and template literals without expressions
      if (prop.value?.type === 'Literal') {
        const raw = prop.value.value
        if (typeof raw !== 'string' || raw.length < 20)
          continue

        pendingMinifications.push({
          end: prop.value.end,
          minified: minifyStringContent(raw, tagType),
          raw,
          start: prop.value.start,
        })
      }
      else if (prop.value?.type === 'TemplateLiteral' && prop.value.expressions.length === 0) {
        const raw = prop.value.quasis[0]?.value?.cooked as string
        if (!raw || raw.length < 20)
          continue

        pendingMinifications.push({
          end: prop.value.end,
          minified: minifyStringContent(raw, tagType),
          raw,
          start: prop.value.start,
        })
      }
    }
  }

  // -- shared plugin state ---------------------------------------------------
  // Fallback build target for bundlers without a per-transform environment
  // (webpack, rspack, Vite <6). Those bundlers create a separate plugin
  // instance per build, so instance-local state is safe there. Under the Vite
  // Environment API (`this.environment`) the target is resolved per transform
  // call instead, since a single plugin instance can serve both the client
  // and server environments in one pipeline.
  let fallbackConsumer: BuildConsumer | undefined
  // Treeshaking is a build-only optimization: the dev server shares one module
  // graph between client and SSR renders. Set to false by `vite.apply()` on
  // serve; the pipeline itself still installs when other concerns are active.
  let treeshakeAllowed = true

  const idPredicates: ((id: string) => boolean)[] = []
  const codeFilterSources: string[] = []
  const idFilterIncludes: RegExp[] = []
  if (treeshakeOpts) {
    idPredicates.push(id => treeshakeEnabled && shouldTransformId(treeshakeOpts, id))
    codeFilterSources.push(SERVER_COMPOSABLE_RE.source)
    idFilterIncludes.push(...(treeshakeOpts.filter?.include || []))
  }
  if (seoMetaOpts) {
    idPredicates.push(id => shouldTransformId(seoMetaOpts, id))
    codeFilterSources.push(SEO_META_RE.source)
    idFilterIncludes.push(...(seoMetaOpts.filter?.include || []))
  }
  if (minifyOpts) {
    idPredicates.push(id => shouldTransformId(minifyOpts, id))
    codeFilterSources.push(HEAD_RE.source)
    idFilterIncludes.push(...(minifyOpts.filter?.include || []))
  }

  return {
    name: config.name,
    enforce: 'post',
    transformInclude: (id: string) => idPredicates.some(predicate => predicate(id)),

    transform: {
      filter: {
        // Union of the active concerns' code prefilters. On rolldown/Vite this
        // runs natively in Rust and skips the JS hook entirely; per-concern
        // regexes re-gate which phases run inside the handler.
        code: new RegExp(codeFilterSources.join('|')),
        id: createJsVueTransformIdFilter(idFilterIncludes),
      },
      async handler(code, id) {
        // Server-only composables are treeshaken from client builds only. On
        // an unknown target (plain rollup, no environment info) we must
        // retain the code, removing it would break SSR output.
        const runTreeshake = !!treeshakeOpts && treeshakeEnabled && treeshakeAllowed
          && shouldTransformId(treeshakeOpts, id)
          && SERVER_COMPOSABLE_RE.test(code)
          && resolveBuildConsumer(this, fallbackConsumer) === 'client'
        const runSeoMeta = !!seoMetaOpts
          && shouldTransformId(seoMetaOpts, id)
          && SEO_META_RE.test(code)
        // Escaped identifiers still need parsing because their source does not
        // contain the decoded property name.
        const runMinify = !!minifyOpts
          && shouldTransformId(minifyOpts, id)
          && HEAD_RE.test(code)
          && (CONTENT_PROP_NAMES.some(name => code.includes(name)) || code.includes('\\u'))

        if (!runTreeshake && !runSeoMeta && !runMinify)
          return

        let ast
        try {
          ast = parseSync(id, code)
        }
        catch {
          return
        }

        const scopeTracker = new ScopeTracker()
        const edits: PipelineEdit[] = []

        // Ranges claimed by the treeshake phase. Statements removed on the
        // client build must not be seoMeta-rewritten or minified, previously
        // guaranteed by plugin registration order (treeshake ran first over
        // the whole module), here enforced per node.
        const removedRanges: [number, number][] = []

        function inRemovedRange(node: any): boolean {
          return removedRanges.some(([start, end]) => node.start >= start && node.end <= end)
        }

        // -- treeshake phase -------------------------------------------------
        function treeshakeEnter(node: any, parent: any): boolean {
          // Only remove statement-level calls: `useServerHead(...)` as its
          // own expression statement. Nested usage (assignments, arguments)
          // is left untouched.
          if (
            parent?.type !== 'ExpressionStatement'
            || node.type !== 'CallExpression'
            || node.callee.type !== 'Identifier'
          ) {
            return false
          }

          const decl = scopeTracker.getDeclaration(node.callee.name)

          if (decl instanceof ScopeTrackerImport) {
            // Proven unhead import (supports aliases: `import { useServerHead as x }`).
            if (
              decl.node.type === 'ImportSpecifier'
              && decl.node.imported.type === 'Identifier'
              && SERVER_COMPOSABLE_NAMES.has(decl.node.imported.name)
              && isUnheadPackage(decl.importNode.source.value)
            ) {
              edits.push({ start: parent.start, end: parent.end, content: null, phase: 'treeshake' })
              removedRanges.push([parent.start, parent.end])
              return true
            }
            return false
          }

          // Any local declaration (function/var/param) shadows the
          // composable name: retain the call.
          if (decl)
            return false

          // No declaration in scope: treat a known name as an auto-import
          // (e.g. Nuxt) and remove it.
          if (SERVER_COMPOSABLE_NAMES.has(node.callee.name)) {
            edits.push({ start: parent.start, end: parent.end, content: null, phase: 'treeshake' })
            removedRanges.push([parent.start, parent.end])
            return true
          }
          return false
        }

        // -- seoMeta phase ---------------------------------------------------
        // Track which ImportDeclarations need specifier rewrites
        // Key: ImportDeclaration node, Value: set of original imported names that were transformed
        const importRewrites = new Map<any, Set<string>>()
        // Track if seoMeta is referenced as a value (not just called), keyed by original imported name
        const valueReferenced = new Set<string>()
        // Track useSeoMeta/useServerSeoMeta calls that could not be transformed (e.g. dynamic first
        // arg, spread properties). The original import must be preserved alongside the useHead rewrite.
        const untransformedCallees = new Set<string>()

        function seoMetaEnter(node: any, parent: any): void {
          // Track value references to seoMeta identifiers (e.g., console.log(useSeoMeta))
          // Skip: call callees (handled below), import specifiers (definitions, not references)
          if (node.type === 'Identifier'
            && !(parent?.type === 'CallExpression' && parent.callee === node)
            && parent?.type !== 'ImportSpecifier') {
            const decl = scopeTracker.getDeclaration(node.name)
            if (decl instanceof ScopeTrackerImport
              && isValidSeoMetaPackage(decl.importNode.source.value)
              && decl.node.type === 'ImportSpecifier'
              && decl.node.imported.type === 'Identifier'
              && SEO_META_NAMES.has(decl.node.imported.name)) {
              valueReferenced.add(decl.node.imported.name)
            }
          }

          if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier')
            return

          const decl = scopeTracker.getDeclaration(node.callee.name)

          let originalName: string
          let importDecl: any = null

          if (decl instanceof ScopeTrackerImport) {
            if (!isValidSeoMetaPackage(decl.importNode.source.value) || decl.node.type !== 'ImportSpecifier' || decl.node.imported.type !== 'Identifier')
              return
            originalName = decl.node.imported.name
            importDecl = decl.importNode
          }
          else if (!decl && SEO_META_NAMES.has(node.callee.name)) {
            // Auto-imported (no declaration found in scope)
            originalName = node.callee.name
          }
          else {
            return
          }

          if (!SEO_META_NAMES.has(originalName))
            return

          const properties = node.arguments[0]?.properties
          if (!properties) {
            if (importDecl)
              untransformedCallees.add(originalName)
            return
          }

          let output: string[] | false = []
          const title = properties.find((property: any) => property.key?.name === 'title')
          const titleTemplate = properties.find((property: any) => property.key?.name === 'titleTemplate')
          const meta = properties.filter((property: any) => property.key?.name !== 'title' && property.key?.name !== 'titleTemplate')
          if (title || titleTemplate || originalName === 'useSeoMeta') {
            output.push('useHead({')
            if (title) {
              output.push(`  title: ${code.substring(title.value.start, title.value.end)},`)
            }
            if (titleTemplate) {
              output.push(`  titleTemplate: ${code.substring(titleTemplate.value.start, titleTemplate.value.end)},`)
            }
          }
          if (originalName === 'useServerSeoMeta') {
            if (output.length) {
              const secondArg = node.arguments[1]
              if (secondArg)
                output.push(`}, ${code.substring(secondArg.start, secondArg.end)});`)
              else
                output.push('});')
            }
            output.push('useServerHead({')
          }

          if (meta.length)
            output.push('  meta: [')

          meta.forEach((property: any) => {
            if (property.type === 'SpreadElement') {
              output = false
              return
            }
            if (property.key.type !== 'Identifier' || !property.value) {
              output = false
              return
            }
            if (output === false)
              return
            const propertyKey = property.key
            let key: string = resolveMetaKeyType(propertyKey.name)
            const keyValue = resolveMetaKeyValue(propertyKey.name)
            let valueKey = 'content'
            if (keyValue === 'charset') {
              valueKey = 'charset'
              key = 'charset'
            }
            let value = code.substring(property.value.start as number, property.value.end as number)

            if (MEDIA_KEYS.has(propertyKey.name)) {
              // Expand an object literal `{ url, width, ... }` into `og:image`, `og:image:width`, ...
              // matching runtime `unpackMeta`. Leaf values may be dynamic; only the structure must
              // be statically known. Returns false when a prop key can't be resolved statically.
              const expandObject = (objNode: any): string | false => {
                const tags: string[] = []
                for (const p of objNode.properties) {
                  // Only plain `key: value` pairs can be reproduced statically. Spreads, getters,
                  // setters, methods, and computed/non-identifier keys bail to runtime.
                  if (p.type === 'SpreadElement' || p.computed || p.method || p.kind !== 'init' || p.key?.type !== 'Identifier')
                    return false
                  // Match runtime `unpackMeta`: `url` -> bare property, `secureUrl` -> `:secure_url`.
                  const name = p.key.name
                  const suffix = name === 'url' ? '' : `:${name === 'secureUrl' ? 'secure_url' : name}`
                  tags.push(`    { ${key}: '${keyValue}${suffix}', ${valueKey}: ${code.substring(p.value.start, p.value.end)} },`)
                }
                return tags.join('\n')
              }
              if (property.value.type === 'ObjectExpression') {
                const expanded = expandObject(property.value)
                if (expanded === false) {
                  output = false
                  return
                }
                output.push(expanded)
                return
              }
              if (property.value.type === 'ArrayExpression') {
                if (!property.value.elements.length)
                  return
                const parts: string[] = []
                for (const element of property.value.elements) {
                  if (!element || element.type !== 'ObjectExpression') {
                    output = false
                    return
                  }
                  const expanded = expandObject(element)
                  if (expanded === false) {
                    output = false
                    return
                  }
                  parts.push(expanded)
                }
                output.push(parts.join('\n'))
                return
              }
              // Primitive literals (string/number/boolean) and template literals always resolve to a
              // scalar -> a single safe tag. Anything else (identifier, ref(), computed(), getter,
              // or a non-primitive literal like a regexp) could resolve to an object/array, so bail
              // to runtime `unpackMeta`.
              const v = property.value
              const primitive = typeof v.value === 'string' || typeof v.value === 'number' || typeof v.value === 'boolean'
              const isScalar = v.type === 'TemplateLiteral'
                || ((v.type === 'Literal' || v.type === 'StringLiteral' || v.type === 'NumericLiteral') && primitive)
              if (!isScalar) {
                output = false
                return
              }
            }

            if (property.value.type === 'ArrayExpression') {
              const elements = property.value.elements
              if (!elements.length)
                return

              const metaTags = elements.map((element: any) => {
                if (element.type !== 'ObjectExpression')
                  return `    { ${key}: '${keyValue}', ${valueKey}: ${code.substring(element.start, element.end)} },`

                return element.properties.map((p: any) => {
                  const propKey = p.key.name
                  const propValue = code.substring(p.value.start, p.value.end)
                  return `    { ${key}: '${keyValue}:${propKey}', ${valueKey}: ${propValue} },`
                }).join('\n')
              })

              output.push(metaTags.join('\n'))
              return
            }
            else if (property.value.type === 'ObjectExpression') {
              const staticValue = materializeStaticStringObject(property.value)
              if (!staticValue) {
                output = false
                return
              }
              try {
                value = JSON.stringify(resolvePackedMetaObjectValue(staticValue, propertyKey.name))
              }
              catch {
                output = false
                return
              }
            }
            if (valueKey === 'charset')
              output.push(`    { ${key}: ${value} },`)
            else
              output.push(`    { ${key}: '${keyValue}', ${valueKey}: ${value} },`)
          })
          if (output) {
            if (meta.length)
              output.push('  ]')
            // Preserve the second argument (options like { head }) if present
            if (node.arguments.length >= 2) {
              const optionsArg = code.substring(node.arguments[1].start, node.arguments[1].end)
              output.push(`}, ${optionsArg})`)
            }
            else {
              output.push('})')
            }
            edits.push({ start: node.start, end: node.end, content: output.join('\n'), phase: 'seoMeta' })

            // Track import for rewriting
            if (importDecl) {
              if (!importRewrites.has(importDecl))
                importRewrites.set(importDecl, new Set())
              importRewrites.get(importDecl)!.add(originalName)
            }
          }
          else if (importDecl) {
            untransformedCallees.add(originalName)
          }
        }

        function seoMetaFinalize(): void {
          // Rewrite import specifiers
          if (rewriteImports && importRewrites.size > 0) {
            for (const [importNode, transformedNames] of importRewrites) {
              const newSpecifiers = new Set<string>()
              for (const spec of importNode.specifiers) {
                if (spec.type !== 'ImportSpecifier')
                  continue
                const importedName = spec.imported.name
                // Preserve the local alias (`useSeoMeta as usm`) so kept call sites stay bound.
                const keepOriginal = importedName === spec.local.name ? importedName : `${importedName} as ${spec.local.name}`
                if (transformedNames.has(importedName)) {
                  newSpecifiers.add(importedName.includes('Server') ? 'useServerHead' : 'useHead')
                  // Keep original import if it's still referenced as a value or called in a form we
                  // couldn't statically transform (dynamic first arg, spread properties, etc.).
                  if (valueReferenced.has(importedName) || untransformedCallees.has(importedName))
                    newSpecifiers.add(keepOriginal)
                }
                else {
                  newSpecifiers.add(keepOriginal)
                }
              }
              edits.push({
                start: importNode.specifiers[0].start,
                end: importNode.specifiers.at(-1).end,
                content: [...newSpecifiers].join(', '),
                phase: 'seoMeta',
              })
            }
          }
        }

        // -- minify phase ----------------------------------------------------
        const pendingMinifications: PendingMinification[] = []

        function minifyEnter(node: any): void {
          if (node.type !== 'CallExpression')
            return

          if (!resolveHeadFunctionName(node.callee, scopeTracker))
            return

          const arg = node.arguments[0]
          if (!arg || arg.type !== 'ObjectExpression')
            return

          // look for script: [...] and style: [...] properties
          for (const prop of arg.properties) {
            if (prop.type !== 'Property' || prop.key?.type !== 'Identifier')
              continue

            const tagType = prop.key.name
            if (tagType !== 'script' && tagType !== 'style')
              continue

            if (tagType === 'script' && !doJS)
              continue
            if (tagType === 'style' && !doCSS)
              continue

            // handle both array and single object: script: [{ innerHTML: '...' }] or script: { innerHTML: '...' }
            const elements = prop.value?.type === 'ArrayExpression'
              ? prop.value.elements
              : [prop.value]

            for (const element of elements) {
              if (!element || element.type !== 'ObjectExpression')
                continue

              processScriptOrStyleObject(element, tagType, pendingMinifications)
            }
          }
        }

        // -- single walk dispatching per node --------------------------------
        walk(ast.program, {
          scopeTracker,
          enter(node: any, parent: any) {
            // Anything inside a treeshake-claimed range is dead code on this
            // build target: none of the phases may touch it.
            if (removedRanges.length && inRemovedRange(node))
              return

            // Phase order per call site is load-bearing: server-composable
            // removal first, then seoMeta lowering, then static minification.
            if (runTreeshake && treeshakeEnter(node, parent))
              return
            if (runSeoMeta)
              seoMetaEnter(node, parent)
            if (runMinify)
              minifyEnter(node)
          },
        })

        if (runSeoMeta)
          seoMetaFinalize()

        if (runMinify && pendingMinifications.length) {
          const minified = await Promise.all(pendingMinifications.map(pending => pending.minified))
          for (let i = 0; i < pendingMinifications.length; i++) {
            const pending = pendingMinifications[i]
            const result = minified[i]
            if (result && result.length < pending.raw.length)
              edits.push({ start: pending.start, end: pending.end, content: JSON.stringify(result), phase: 'minify' })
          }
        }

        if (!edits.length)
          return

        const s = new MagicString(code)
        applyEdits(s, edits, id)

        if (!s.hasChanged())
          return

        return {
          code: s.toString(),
          map: s.generateMap({ includeContent: true, source: id }) as SourceMapInput,
        }
      },
    },
    webpack(ctx) {
      fallbackConsumer = ctx.name === 'server' ? 'server' : 'client'
    },
    vite: {
      // Per-call target resolution via `this.environment` makes the plugin
      // safe to share across environments in a single build pipeline.
      sharedDuringBuild: true,
      apply(_config: UserConfig, env: ConfigEnv) {
        if (env.command === 'serve') {
          // Dev server shares one module graph between client and SSR renders;
          // treeshaking is a build-only optimization. The pipeline itself only
          // installs on serve when other concerns are active.
          treeshakeAllowed = false
          return !!seoMetaOpts || !!minifyOpts
        }
        fallbackConsumer = env.isSsrBuild ? 'server' : 'client'
        return true
      },
    },
  }
}

/**
 * Unified transform plugin running the treeshake, seoMeta and minify concerns
 * over a single parse/walk per module. Concern options must be pre-resolved
 * by the caller (`Unhead()` / `createFrameworkPlugin()`), passing `false` for
 * disabled concerns.
 *
 * @internal
 */
export const UnheadTransforms = createUnplugin<TransformPipelineOptions, false>((options: TransformPipelineOptions = {}) =>
  createTransformPipeline({
    name: 'unhead:transforms',
    treeshake: options.treeshake ?? false,
    seoMeta: options.seoMeta ?? false,
    minify: options.minify ?? false,
  }))

function getStaticPropertyKey(prop: any): string | undefined {
  if (prop.computed)
    return undefined
  if (prop.key?.type === 'Identifier')
    return prop.key.name
  if ((prop.key?.type === 'Literal' || prop.key?.type === 'StringLiteral') && typeof prop.key.value === 'string')
    return prop.key.value
}

function getStaticStringValue(node: any): string | undefined {
  if ((node?.type === 'Literal' || node?.type === 'StringLiteral') && typeof node.value === 'string')
    return node.value
}

function isUnsafeObjectKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype'
}

function materializeStaticStringObject(node: any): Record<string, string> | false {
  const out: Record<string, string> = Object.create(null)
  for (const prop of node.properties) {
    if (prop.type === 'SpreadElement' || prop.computed || prop.method || prop.kind !== 'init')
      return false
    const key = getStaticPropertyKey(prop)
    const value = getStaticStringValue(prop.value)
    if (!key || isUnsafeObjectKey(key) || value === undefined)
      return false
    out[key] = value
  }
  return out
}
