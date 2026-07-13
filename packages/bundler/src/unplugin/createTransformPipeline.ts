import type { SourceMapInput } from 'rollup'
import type { UnpluginOptions as UnpluginRawOptions } from 'unplugin'
import type { ConfigEnv, UserConfig } from 'vite'
import type { BaseTransformerTypes } from './types'
import type { BuildConsumer } from './utils'
import MagicString from 'magic-string'
import { parseSync } from 'oxc-parser'
import { ScopeTracker, ScopeTrackerImport, walk } from 'oxc-walker'
import {
  MetaTagsArrayable,
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

        // Lower one flat meta prop (`description: ...`, `robots: {...}`) into
        // `{ name/property, content }` line(s). Returns `false` when the value
        // needs runtime handling (dynamic media value, undecodable nested object).
        //
        // Runtime `unpackMeta` renders in two groups: structural expansions
        // (media objects/arrays, array values) are collected into `extras` and
        // rendered BEFORE the scalar/packed `primitives`, regardless of source
        // order. Each lowered prop is therefore tagged with its group so the
        // caller can reproduce `[...extras, ...primitives]`.
        function lowerMetaProperty(property: any): { group: 'extras' | 'primitives', lines: string[] } | false {
          const propertyKey = property.key
          let key: string = resolveMetaKeyType(propertyKey.name)
          const keyValue = resolveMetaKeyValue(propertyKey.name)
          let valueKey = 'content'
          if (keyValue === 'charset') {
            valueKey = 'charset'
            key = 'charset'
          }
          // `http-equiv` is not a valid identifier and must be emitted quoted
          if (key === 'http-equiv')
            key = '\'http-equiv\''
          let value = code.substring(property.value.start as number, property.value.end as number)

          if (MEDIA_KEYS.has(propertyKey.name)) {
            // Expand an object literal `{ url, width, ... }` into `og:image`, `og:image:width`, ...
            // matching runtime `unpackMeta`. Leaf values may be dynamic; only the structure must
            // be statically known. Returns false when a prop key can't be resolved statically.
            // Runtime emits `url` (then `secureUrl` for object values) before the other props.
            const expandObject = (objNode: any, secureUrlFirst: boolean): string | false => {
              const urlTags: string[] = []
              const secureUrlTags: string[] = []
              const otherTags: string[] = []
              for (const p of objNode.properties) {
                // Only plain `key: value` pairs can be reproduced statically. Spreads, getters,
                // setters, methods, and computed/non-identifier keys bail to runtime.
                if (p.type === 'SpreadElement' || p.computed || p.method || p.kind !== 'init' || p.key?.type !== 'Identifier')
                  return false
                // Match runtime `unpackMeta`: `url` -> bare property, `secureUrl` -> `:secure_url`.
                const name = p.key.name
                const suffix = name === 'url' ? '' : `:${name === 'secureUrl' ? 'secure_url' : name}`
                const tag = `    { ${key}: '${keyValue}${suffix}', ${valueKey}: ${code.substring(p.value.start, p.value.end)} },`
                if (name === 'url')
                  urlTags.push(tag)
                else if (name === 'secureUrl' && secureUrlFirst)
                  secureUrlTags.push(tag)
                else
                  otherTags.push(tag)
              }
              return [...urlTags, ...secureUrlTags, ...otherTags].join('\n')
            }
            if (property.value.type === 'ObjectExpression') {
              const expanded = expandObject(property.value, true)
              if (expanded === false)
                return false
              return { group: 'extras', lines: [expanded] }
            }
            if (property.value.type === 'ArrayExpression') {
              if (!property.value.elements.length)
                return { group: 'extras', lines: [] }
              const parts: string[] = []
              for (const element of property.value.elements) {
                if (!element || element.type !== 'ObjectExpression')
                  return false
                // The runtime array branch hoists only `url` per element.
                const expanded = expandObject(element, false)
                if (expanded === false)
                  return false
                parts.push(expanded)
              }
              return { group: 'extras', lines: [parts.join('\n')] }
            }
            // Primitive literals (string/number/boolean) and template literals always resolve to a
            // scalar -> a single safe tag. Anything else (identifier, ref(), computed(), getter,
            // or a non-primitive literal like a regexp) could resolve to an object/array, so bail
            // to runtime `unpackMeta`.
            const v = property.value
            const primitive = typeof v.value === 'string' || typeof v.value === 'number' || typeof v.value === 'boolean'
            const isScalar = v.type === 'TemplateLiteral'
              || ((v.type === 'Literal' || v.type === 'StringLiteral' || v.type === 'NumericLiteral') && primitive)
            if (!isScalar)
              return false
          }

          if (property.value.type === 'ArrayExpression') {
            const elements = property.value.elements
            if (!elements.length)
              return { group: 'extras', lines: [] }

            const metaTags: string[] = []
            for (const element of elements) {
              if (!element || element.type === 'SpreadElement')
                return false
              if (element.type !== 'ObjectExpression') {
                metaTags.push(`    { ${key}: '${keyValue}', ${valueKey}: ${code.substring(element.start, element.end)} },`)
                continue
              }
              const propTags: string[] = []
              for (const p of element.properties) {
                if (p.type === 'SpreadElement' || p.computed || p.key?.type !== 'Identifier')
                  return false
                const propKey = p.key.name
                const propValue = code.substring(p.value.start, p.value.end)
                propTags.push(`    { ${key}: '${keyValue}:${propKey}', ${valueKey}: ${propValue} },`)
              }
              metaTags.push(propTags.join('\n'))
            }

            return { group: 'extras', lines: [metaTags.join('\n')] }
          }
          else if (property.value.type === 'ObjectExpression') {
            const packed = lowerPackedMetaObject(property.value, propertyKey.name)
            if (packed === false)
              return false
            value = packed
          }
          if (valueKey === 'charset')
            return { group: 'primitives', lines: [`    { ${key}: ${value} },`] }
          return { group: 'primitives', lines: [`    { ${key}: '${keyValue}', ${valueKey}: ${value} },`] }
        }

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

          const output: string[] = []
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

          // Lower meta props in source order. A structural failure (spread,
          // computed/non-identifier key) bails the whole call; a value-level
          // failure (dynamic media value, undecodable nested object) may
          // instead split the unsupported tail into a residual runtime call
          // when that is provably render-identical (see `canEmitResidual`).
          // Runtime `unpackMeta` renders structural expansions before scalar/
          // packed props (`[...extras, ...meta]`); group lines accordingly.
          const extraLines: string[] = []
          const primitiveLines: string[] = []
          let bail = false
          let failedAt = -1
          for (let i = 0; i < meta.length; i++) {
            const property = meta[i]
            if (property.type === 'SpreadElement' || property.key.type !== 'Identifier' || !property.value) {
              bail = true
              break
            }
            const lowered = lowerMetaProperty(property)
            if (lowered === false) {
              failedAt = i
              break
            }
            (lowered.group === 'extras' ? extraLines : primitiveLines).push(...lowered.lines)
          }
          const metaLines = [...extraLines, ...primitiveLines]

          let residualProps: any[] | null = null
          if (!bail && failedAt !== -1) {
            if (canEmitResidual(node, parent, originalName, title, titleTemplate, meta, failedAt))
              residualProps = meta.slice(failedAt)
            else
              bail = true
          }

          if (!bail) {
            const loweredMetaCount = failedAt === -1 ? meta.length : failedAt
            if (loweredMetaCount) {
              output.push('  meta: [')
              output.push(...metaLines)
              output.push('  ]')
            }
            // Preserve the second argument (options like { head }) if present
            if (node.arguments.length >= 2) {
              const optionsArg = code.substring(node.arguments[1].start, node.arguments[1].end)
              output.push(`}, ${optionsArg})`)
            }
            else if (residualProps) {
              // Per-prop fallback: keep the unsupported tail props on the
              // original composable, adjacent to the lowered entry, so runtime
              // `unpackMeta` handles them (same source order, disjoint names).
              output.push('});')
              output.push(`${code.substring(node.callee.start, node.callee.end)}({ ${residualProps.map((p: any) => code.substring(p.start, p.end)).join(', ')} })`)
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
              // The residual call still references the original composable.
              if (residualProps)
                untransformedCallees.add(originalName)
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

function isUnsafeObjectKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype'
}

const DECODE_BAIL = Symbol('unhead:decode-bail')

type DecodedStaticValue = string | number | boolean | null | DecodedStaticValue[] | { [key: string]: DecodedStaticValue }

const LITERAL_TYPES = new Set(['Literal', 'StringLiteral', 'NumericLiteral', 'BooleanLiteral', 'NullLiteral'])

/**
 * Safe recursive AST-value decoder. Turns a statically-analyzable expression
 * into the JS value it evaluates to, without ever evaluating source text:
 *
 * - string/number/boolean/`null` literals
 * - unary `-`/`+` on a numeric literal (`-1`, `+1.5`)
 * - template literals with zero expressions
 * - arrays of supported values (source order preserved)
 * - plain object literals with static identifier/string keys (source order preserved)
 *
 * Everything else (spreads, computed keys, getters/setters/methods, unsafe
 * prototype keys, identifiers, calls, member expressions, regexp/bigint
 * literals, array holes) returns the `DECODE_BAIL` sentinel; it never throws.
 */
function decodeStaticValue(node: any): DecodedStaticValue | typeof DECODE_BAIL {
  if (!node)
    return DECODE_BAIL
  if (LITERAL_TYPES.has(node.type)) {
    // regexp literals carry a `regex` payload (their `value` may be a RegExp
    // or null), bigint literals a `bigint` payload; neither is supported
    if (node.regex !== undefined || node.bigint !== undefined)
      return DECODE_BAIL
    const value = node.value
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
      return value
    return DECODE_BAIL
  }
  if (node.type === 'UnaryExpression') {
    // only numeric negation/plus on a plain numeric literal (`-1`, `+1.5`)
    const arg = node.argument
    if ((node.operator !== '-' && node.operator !== '+')
      || !arg
      || !LITERAL_TYPES.has(arg.type)
      || arg.regex !== undefined
      || arg.bigint !== undefined
      || typeof arg.value !== 'number') {
      return DECODE_BAIL
    }
    return node.operator === '-' ? -arg.value : arg.value
  }
  if (node.type === 'TemplateLiteral') {
    if (node.expressions.length > 0)
      return DECODE_BAIL
    const cooked = node.quasis[0]?.value?.cooked
    return typeof cooked === 'string' ? cooked : DECODE_BAIL
  }
  if (node.type === 'ArrayExpression') {
    const out: DecodedStaticValue[] = []
    for (const element of node.elements) {
      // reject holes (`[1, , 2]`) and spreads
      if (!element || element.type === 'SpreadElement')
        return DECODE_BAIL
      const value = decodeStaticValue(element)
      if (value === DECODE_BAIL)
        return DECODE_BAIL
      out.push(value)
    }
    return out
  }
  if (node.type === 'ObjectExpression') {
    const out: Record<string, DecodedStaticValue> = Object.create(null)
    for (const prop of node.properties) {
      if (prop.type === 'SpreadElement' || prop.computed || prop.method || prop.kind !== 'init')
        return DECODE_BAIL
      const key = getStaticPropertyKey(prop)
      if (!key || isUnsafeObjectKey(key))
        return DECODE_BAIL
      const value = decodeStaticValue(prop.value)
      if (value === DECODE_BAIL)
        return DECODE_BAIL
      out[key] = value
    }
    return out
  }
  return DECODE_BAIL
}

/**
 * Mirrors runtime `String(value)` for decoded values, used to replicate
 * `sanitizeObject` (which drops entries whose value stringifies to 'false').
 * Decoded objects are built with a null prototype so `String()` can't be
 * called on them directly; at runtime a plain object stringifies to
 * '[object Object]', arrays join with ',' and null elements become ''.
 */
function runtimeString(value: DecodedStaticValue): string {
  if (Array.isArray(value))
    return value.map(v => v === null ? '' : runtimeString(v)).join(',')
  if (value !== null && typeof value === 'object')
    return '[object Object]'
  return String(value)
}

/**
 * Lower a nested plain-object meta value (`robots: { maxSnippet: -1 }`) to the
 * exact content string runtime `unpackMeta` would produce, or `false` when the
 * value must be left to runtime.
 */
function lowerPackedMetaObject(node: any, key: string): string | false {
  // Arrayable meta keys (themeColor, author, googleSiteVerification, ...)
  // route through runtime `handleObjectEntry`, which expands the object into
  // sibling tags rather than packing it into one content string.
  if (MetaTagsArrayable.has(resolveMetaKeyValue(key) as any))
    return false
  const decoded = decodeStaticValue(node)
  if (decoded === DECODE_BAIL)
    return false
  // Runtime `unpackMeta` passes object values through `sanitizeObject` before
  // packing: top-level entries whose value stringifies to 'false' are dropped.
  const sanitized: Record<string, DecodedStaticValue> = Object.create(null)
  for (const k of Object.keys(decoded as Record<string, DecodedStaticValue>)) {
    const v = (decoded as Record<string, DecodedStaticValue>)[k]
    if (runtimeString(v) !== 'false')
      sanitized[k] = v
  }
  try {
    return JSON.stringify(resolvePackedMetaObjectValue(sanitized, key))
  }
  catch {
    return false
  }
}

/**
 * Whether the unsupported tail of a `useSeoMeta` call may be split into a
 * residual runtime call adjacent to the lowered `useHead` entry. Splitting
 * creates a second head entry, so it is only allowed when rendering is
 * provably identical to the original single entry:
 *
 * - the call result is unused (two statements are emitted in its place)
 * - no options argument (it would have to be evaluated twice)
 * - something is actually lowered, otherwise the call is left untouched;
 *   `useServerSeoMeta` additionally requires at least one lowered meta prop
 *   so an empty `useServerHead({})` entry is never emitted
 * - `title`/`titleTemplate` are hoisted into the lowered entry regardless of
 *   source position, so they must not appear after the failure point
 * - residual props are plain `key: value` identifiers whose resolved meta
 *   names are disjoint from the lowered props' names; a shared name would
 *   dedupe across the two entries and could reorder rendered tags
 * - runtime `unpackMeta` renders structural expansions (`extras`) before
 *   scalar/packed props, per CALL. When meta props were lowered, a residual
 *   prop that could produce extras at runtime (a dynamic media value, an
 *   array, an arrayable-key object) would render before the lowered props in
 *   the original but after them in the split output. So either nothing was
 *   lowered into `meta` (`failedAt === 0`), or every residual prop must be
 *   provably primitives-routed: a plain object literal on a non-media,
 *   non-arrayable key
 */
function canEmitResidual(node: any, parent: any, originalName: string, title: any, titleTemplate: any, meta: any[], failedAt: number): boolean {
  if (parent?.type !== 'ExpressionStatement' || node.arguments.length >= 2)
    return false
  if (failedAt === 0 && (originalName === 'useServerSeoMeta' || (!title && !titleTemplate)))
    return false
  const residual = meta.slice(failedAt)
  const residualStart = residual[0].start
  if ((title && title.start > residualStart) || (titleTemplate && titleTemplate.start > residualStart))
    return false
  for (const p of residual) {
    if (p.type !== 'Property' || p.computed || p.key?.type !== 'Identifier' || !p.value)
      return false
    if (failedAt > 0 && (
      p.value.type !== 'ObjectExpression'
      || MEDIA_KEYS.has(p.key.name)
      || MetaTagsArrayable.has(resolveMetaKeyValue(p.key.name) as any)
    )) {
      return false
    }
  }
  const loweredNames = new Set(meta.slice(0, failedAt).map((p: any) => resolveMetaKeyValue(p.key.name)))
  return residual.every((p: any) => !loweredNames.has(resolveMetaKeyValue(p.key.name)))
}
