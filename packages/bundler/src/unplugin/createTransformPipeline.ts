import type { SourceMapInput } from 'rollup'
import type { UnpluginOptions as UnpluginRawOptions } from 'unplugin'
import type { ConfigEnv, UserConfig } from 'vite'
import type { BaseTransformerTypes } from './types'
import type { BuildConsumer } from './utils'
import MagicString from 'magic-string'
import { parseSync } from 'oxc-parser'
import { ScopeTracker, ScopeTrackerImport, walk } from 'oxc-walker'
import { capoTagWeight, propsToString, tagToString } from 'unhead/server'
import {
  dedupeKey,
  hashTag,
  isMetaArrayDupeKey,
  MetaTagsArrayable,
  normalizeEntryToTags,
  resolveMetaKeyType,
  resolveMetaKeyValue,
  resolvePackedMetaObjectValue,
  sanitizeTags,
  TagPriorityAliases,
  unpackMeta,
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
const PRECOMPILE_RE = /\b(?:createHead|useHead|useSeoMeta)\b/
const STRICT_PRECOMPILE_SOURCE_RE = /unhead\/precompiled\/(?:client|server)/

const SERVER_COMPOSABLE_NAMES = new Set([
  'useServerHead',
  'useServerHeadSafe',
  'useServerSeoMeta',
  // plugins
  'useSchemaOrg',
])

const SEO_META_NAMES = new Set(['useSeoMeta', 'useServerSeoMeta'])
const PRECOMPILE_FN_NAMES = new Set(['createHead', 'useHead', 'useSeoMeta'])

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
const DECODE_BAIL = Symbol('unhead:decode-bail')
const LITERAL_TYPES = new Set(['Literal', 'StringLiteral', 'NumericLiteral', 'BooleanLiteral', 'NullLiteral'])

function getModuleExportName(node: any): string | undefined {
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

type TagType = 'script' | 'style'
type DecodedStaticValue = string | number | boolean | null | DecodedStaticValue[] | { [key: string]: DecodedStaticValue }

interface PendingMinification {
  end: number
  minified: Promise<string | null>
  raw: string
  start: number
}

interface PendingPrecompilation {
  consumer: BuildConsumer
  end: number
  head: string
  name: string
  source: Promise<string>
  start: number
}

interface PendingHeadCreation {
  disableDefaults: boolean
  end: number
  start: number
}

// Kept build-side so transformed createHead() calls can tree-shake the runtime
// factory. Runtime/default equivalence is covered by precompile transform tests.
const PRECOMPILED_DEFAULT_PLAN = [
  [-20, 'charset', '<meta charset="utf-8">'],
  [-15, 'meta:viewport', '<meta name="viewport" content="width=device-width, initial-scale=1">'],
  [100, 'htmlAttrs:lang', ' lang="en"', 3],
] as const

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
  /** @internal */
  consumer?: BuildConsumer
  treeshake?: TreeshakeServerComposablesOptions | false
  seoMeta?: UseSeoMetaTransformOptions | false
  precompile?: BaseTransformerTypes | false
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
  phase: 'treeshake' | 'seoMeta' | 'precompile' | 'minify'
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
  const precompileOpts = config.precompile === false ? undefined : config.precompile
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
    if (s === 'unhead' || s.startsWith('unhead/') || s.startsWith('@unhead/')) {
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

  function resolvePrecompileFunction(callee: any, scopeTracker: ScopeTracker): { consumer?: BuildConsumer, kind: 'createHead' | 'useHead' | 'useSeoMeta', strict: boolean } | undefined {
    if (callee.type === 'Identifier') {
      const decl = scopeTracker.getDeclaration(callee.name)
      if (decl instanceof ScopeTrackerImport) {
        const importedName = decl.node.type === 'ImportSpecifier' ? getModuleExportName(decl.node.imported) : undefined
        if (decl.node.type === 'ImportSpecifier'
          && importedName
          && decl.importNode.importKind !== 'type'
          && decl.node.importKind !== 'type'
          && PRECOMPILE_FN_NAMES.has(importedName)
          && isValidSeoMetaPackage(decl.importNode.source.value)) {
          return {
            consumer: decl.importNode.source.value.endsWith('/client') ? 'client' : decl.importNode.source.value.endsWith('/server') ? 'server' : undefined,
            kind: importedName as 'createHead' | 'useHead' | 'useSeoMeta',
            strict: decl.importNode.source.value === 'unhead/precompiled/client' || decl.importNode.source.value === 'unhead/precompiled/server',
          }
        }
      }
      else if (!decl && PRECOMPILE_FN_NAMES.has(callee.name)) {
        return { kind: callee.name as 'createHead' | 'useHead' | 'useSeoMeta', strict: false }
      }
      return
    }

    const memberName = getMemberName(callee)
    if (!memberName
      || callee.object.type !== 'Identifier'
      || !PRECOMPILE_FN_NAMES.has(memberName)) {
      return
    }

    const decl = scopeTracker.getDeclaration(callee.object.name)
    if (decl instanceof ScopeTrackerImport
      && decl.node.type === 'ImportNamespaceSpecifier'
      && isValidSeoMetaPackage(decl.importNode.source.value)) {
      return {
        consumer: decl.importNode.source.value.endsWith('/client') ? 'client' : decl.importNode.source.value.endsWith('/server') ? 'server' : undefined,
        kind: memberName as 'createHead' | 'useHead' | 'useSeoMeta',
        strict: decl.importNode.source.value === 'unhead/precompiled/client' || decl.importNode.source.value === 'unhead/precompiled/server',
      }
    }
  }

  function normalizeStaticSeoMetaInput(input: Record<string, DecodedStaticValue>): Record<string, any> {
    const headInput: Record<string, any> = Object.create(null)
    const flatMeta: Record<string, any> = Object.create(null)
    for (const key of Object.keys(input)) {
      if (key === 'title' || key === 'titleTemplate')
        headInput[key] = input[key]
      else
        flatMeta[key] = input[key]
    }
    if (Object.keys(flatMeta).length)
      headInput.meta = unpackMeta(flatMeta)
    return headInput
  }

  async function compileStaticInput(
    input: Record<string, DecodedStaticValue>,
    kind: 'useHead' | 'useSeoMeta',
    minifyContents: boolean,
    fail: (reason: string) => never,
  ): Promise<string> {
    const normalizedInput = kind === 'useSeoMeta' ? normalizeStaticSeoMetaInput(input) : input
    const tags = normalizeEntryToTags(normalizedInput, [])

    const contentMinifications: Promise<void>[] = []
    for (const tag of minifyContents ? tags : []) {
      const tagType = tag.tag === 'script' || tag.tag === 'style' ? tag.tag : undefined
      if (!tagType || (tagType === 'script' ? !doJS : !doCSS))
        continue
      if (tagType === 'script' && SKIP_JS_TYPES.has(tag.props.type))
        continue
      for (const key of CONTENT_PROP_NAMES) {
        const raw = tag[key as 'innerHTML' | 'textContent']
        if (typeof raw !== 'string' || raw.length < 20)
          continue
        contentMinifications.push(minifyStringContent(raw, tagType).then((result) => {
          if (result && result.length < raw.length)
            tag[key as 'innerHTML' | 'textContent'] = result
        }))
      }
    }
    await Promise.all(contentMinifications)

    if (tags.some(tag => tag.tag === 'templateParams'))
      fail('templateParams require runtime plugin processing')
    if (tags.some(tag => tag.processTemplateParams !== undefined))
      fail('processTemplateParams requires runtime plugin processing')
    if (tags.some(tag => tag.tagDuplicateStrategy !== undefined))
      fail('tagDuplicateStrategy is not supported by the sealed runtime')
    if (tags.some(tag => tag.tag === 'titleTemplate'))
      fail('titleTemplate has cross-entry runtime semantics and is not supported')
    if (tags.some(tag => tag.key !== undefined))
      fail('explicit tag keys require cross-entry prop merging and are not supported')
    if (tags.some(tag => (tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs') && (tag.props.class !== undefined || tag.props.style !== undefined)))
      fail('class and style attributes require cross-entry merging and are not supported')
    if (tags.some(tag => tag.tagPosition && tag.tagPosition !== 'head' && tag.tagPosition !== 'bodyOpen' && tag.tagPosition !== 'bodyClose'))
      fail('tagPosition must be head, bodyOpen, or bodyClose')

    for (const tag of tags) {
      tag._w = capoTagWeight(tag)
      tag._d = dedupeKey(tag)
      if (!tag._d)
        tag._h = hashTag(tag)
    }

    type CompiledRecord = [number, string, string, (0 | 1 | 2 | 3 | 4)?]
    const plan: CompiledRecord[] = []
    const arrayableIdentities = new Set<string>()
    for (const originalTag of tags) {
      // Generic resolution dedupes before sanitizing. Keep an empty rendered
      // record as a tombstone so a later invalid duplicate still removes an
      // earlier valid tag without shipping the sanitizer.
      const sanitizedTag = sanitizeTags([originalTag])[0]
      const tag = sanitizedTag || originalTag
      const weight = tag._w!
      if (tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs') {
        const position = tag.tag === 'htmlAttrs' ? 3 : 4
        for (const key in tag.props) {
          const html = propsToString({ [key]: tag.props[key] })
          plan.push([weight, `${tag.tag}:${key}`, html, position])
        }
        continue
      }

      // Generic resolution chooses identity before sanitization. Escaping can
      // make distinct script bodies render alike without making them dupes.
      const identity = originalTag._d || originalTag._h || hashTag(originalTag)
      const position = tag.tagPosition === 'bodyOpen' ? 1 : tag.tagPosition === 'bodyClose' ? 2 : undefined
      const html = sanitizedTag ? tagToString(tag) : ''
      if (tag.tag === 'meta' && isMetaArrayDupeKey(identity)) {
        if (arrayableIdentities.has(identity))
          fail('arrayable meta identities may occur only once per call')
        arrayableIdentities.add(identity)
        plan.push(position ? [weight, identity, html, position] : [weight, identity, html])
        continue
      }
      plan.push(position ? [weight, identity, html, position] : [weight, identity, html])
    }
    return JSON.stringify(plan)
  }

  async function compileStaticClientInput(
    input: Record<string, DecodedStaticValue>,
    kind: 'useHead' | 'useSeoMeta',
    minifyContents: boolean,
    fail: (reason: string) => never,
  ): Promise<string> {
    const normalizedInput = kind === 'useSeoMeta' ? normalizeStaticSeoMetaInput(input) : input
    const tags = normalizeEntryToTags(normalizedInput, [])

    const contentMinifications: Promise<void>[] = []
    for (const tag of minifyContents ? tags : []) {
      const tagType = tag.tag === 'script' || tag.tag === 'style' ? tag.tag : undefined
      if (!tagType || (tagType === 'script' ? !doJS : !doCSS))
        continue
      if (tagType === 'script' && SKIP_JS_TYPES.has(tag.props.type))
        continue
      for (const key of CONTENT_PROP_NAMES) {
        const raw = tag[key as 'innerHTML' | 'textContent']
        if (typeof raw !== 'string' || raw.length < 20)
          continue
        contentMinifications.push(minifyStringContent(raw, tagType).then((result) => {
          if (result && result.length < raw.length)
            tag[key as 'innerHTML' | 'textContent'] = result
        }))
      }
    }
    await Promise.all(contentMinifications)

    if (tags.some(tag => tag.tag === 'templateParams'))
      fail('templateParams require runtime plugin processing')
    if (tags.some(tag => tag.processTemplateParams !== undefined))
      fail('processTemplateParams requires runtime plugin processing')
    if (tags.some(tag => tag.tagDuplicateStrategy !== undefined))
      fail('tagDuplicateStrategy is not supported by the sealed runtime')
    if (tags.some(tag => tag.tag === 'titleTemplate'))
      fail('titleTemplate has cross-entry runtime semantics and is not supported')
    if (tags.some(tag => tag.key !== undefined))
      fail('explicit tag keys are not supported by the sealed runtime')
    if (tags.some(tag => (tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs') && (tag.props.class !== undefined || tag.props.style !== undefined)))
      fail('class and style attributes require runtime merge tracking and are not supported')
    if (tags.some(tag => tag.tagPosition && tag.tagPosition !== 'head' && tag.tagPosition !== 'bodyOpen' && tag.tagPosition !== 'bodyClose'))
      fail('tagPosition must be head, bodyOpen, or bodyClose')

    for (const tag of tags) {
      tag._d = dedupeKey(tag)
      if (!tag._d)
        tag._h = hashTag(tag)
    }

    type ClientRecord = [number, string, string, Record<string, any>, string?, (1 | 2)?, 1?]
    const plan: ClientRecord[] = []
    const arrayableIdentities = new Set<string>()
    for (const originalTag of tags) {
      const sanitizedTag = sanitizeTags([originalTag])[0]
      const tag = sanitizedTag || originalTag
      const identity = originalTag._d || originalTag._h || hashTag(originalTag)
      if (originalTag.tag === 'meta' && isMetaArrayDupeKey(identity)) {
        if (arrayableIdentities.has(identity))
          fail('arrayable meta identities may occur only once per call')
        arrayableIdentities.add(identity)
      }
      const weight = typeof tag.tagPriority === 'number' ? tag.tagPriority : 100 + (TagPriorityAliases[tag.tagPriority as keyof typeof TagPriorityAliases] || 0)
      if (tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs') {
        for (const key in tag.props)
          plan.push([weight, `${tag.tag}:${key}`, tag.tag, { [key]: tag.props[key] }])
        continue
      }
      if (!sanitizedTag) {
        plan.push([weight, identity, '', {}])
        continue
      }
      const position = tag.tagPosition === 'bodyOpen' ? 1 : tag.tagPosition === 'bodyClose' ? 2 : undefined
      const content = tag.innerHTML ?? tag.textContent
      const record: ClientRecord = [weight, identity, tag.tag, tag.props]
      if (content !== undefined || position || tag.innerHTML !== undefined) {
        record[4] = content === undefined ? '' : String(content)
        if (position || tag.innerHTML !== undefined)
          record[5] = position
        if (tag.innerHTML !== undefined)
          record[6] = 1
      }
      plan.push(record)
    }
    return JSON.stringify(plan)
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
  let fallbackConsumer: BuildConsumer | undefined = config.consumer
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
  if (precompileOpts) {
    idPredicates.push(id => shouldTransformId(precompileOpts, id))
    codeFilterSources.push(PRECOMPILE_RE.source)
    codeFilterSources.push(STRICT_PRECOMPILE_SOURCE_RE.source)
    idFilterIncludes.push(...(precompileOpts.filter?.include || []))
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
        const precompileConsumer = resolveBuildConsumer(this, fallbackConsumer)
        const runPrecompile = !!precompileOpts
          && shouldTransformId(precompileOpts, id)
          && (PRECOMPILE_RE.test(code) || STRICT_PRECOMPILE_SOURCE_RE.test(code))
          && (precompileConsumer === 'client' || precompileConsumer === 'server')
        // Escaped identifiers still need parsing because their source does not
        // contain the decoded property name.
        const minifyEligible = !!minifyOpts && shouldTransformId(minifyOpts, id)
        const runMinify = minifyEligible
          && HEAD_RE.test(code)
          && (CONTENT_PROP_NAMES.some(name => code.includes(name)) || code.includes('\\u'))

        if (!runTreeshake && !runSeoMeta && !runPrecompile && !runMinify)
          return

        let ast
        try {
          ast = parseSync(id, code)
        }
        catch {
          return
        }

        const scopeTracker = new ScopeTracker({ preserveExitedScopes: true })
        // Pre-pass: collect all declarations first so hoisted locals
        // (`function useServerHead() {}` below a call site) are visible when
        // the phase walk visits earlier statements.
        walk(ast.program, { scopeTracker })
        scopeTracker.freeze()

        const edits: PipelineEdit[] = []
        let precompilePrefix = '__unhead_precompiled'
        while (code.includes(precompilePrefix))
          precompilePrefix += '_'

        // Ranges claimed by the treeshake phase. Statements removed on the
        // client build must not be seoMeta-rewritten or minified, previously
        // guaranteed by plugin registration order (treeshake ran first over
        // the whole module), here enforced per node.
        const removedRanges: [number, number][] = []
        const precompiledRanges: [number, number][] = []

        function inRemovedRange(node: any): boolean {
          return removedRanges.some(([start, end]) => node.start >= start && node.end <= end)
        }

        function inPrecompiledRange(node: any): boolean {
          return precompiledRanges.some(([start, end]) => node.start >= start && node.end <= end)
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

          // The composable return value wraps `.patch()` so future flat-meta
          // inputs keep being normalized. Lowering an observed call to
          // `useHead()` would silently lose that behavior.
          if (parent?.type !== 'ExpressionStatement') {
            if (importDecl)
              untransformedCallees.add(originalName)
            return
          }

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
              const namedSpecifiers = importNode.specifiers.filter((spec: any) => spec.type === 'ImportSpecifier')
              for (const spec of namedSpecifiers) {
                const rawSpecifier = code.substring(spec.start, spec.end)
                const importedName = spec.imported.type === 'Identifier' ? spec.imported.name : undefined
                if (!importedName) {
                  newSpecifiers.add(rawSpecifier)
                  continue
                }
                if (transformedNames.has(importedName)) {
                  newSpecifiers.add(importedName.includes('Server') ? 'useServerHead' : 'useHead')
                  // Keep original import if it's still referenced as a value or called in a form we
                  // couldn't statically transform (dynamic first arg, spread properties, etc.).
                  if (valueReferenced.has(importedName) || untransformedCallees.has(importedName))
                    newSpecifiers.add(rawSpecifier)
                }
                else {
                  newSpecifiers.add(rawSpecifier)
                }
              }
              if (!namedSpecifiers.length)
                continue
              edits.push({
                start: namedSpecifiers[0].start,
                end: namedSpecifiers.at(-1).end,
                content: [...newSpecifiers].join(', '),
                phase: 'seoMeta',
              })
            }
          }
        }

        // -- precompile phase ------------------------------------------------
        const pendingPrecompilations: PendingPrecompilation[] = []
        const pendingHeadCreations: PendingHeadCreation[] = []
        const safeStrictReferences = new WeakSet<object>()

        function precompileFailure(node: any, reason: string): never {
          const start = typeof node?.start === 'number' ? node.start : 0
          const preceding = code.slice(0, start)
          const line = preceding.split('\n').length
          const lastLineBreak = preceding.lastIndexOf('\n')
          const column = start - lastLineBreak
          const location = `${id}:${line}:${column}`
          throw new Error(`[@unhead/bundler] strict precompile failed at ${location}: ${reason}`)
        }

        function markStrictCallee(callee: any): void {
          if (callee.type === 'Identifier')
            safeStrictReferences.add(callee)
          else if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier')
            safeStrictReferences.add(callee.object)
        }

        function validateStrictReference(node: any, parent: any): void {
          if (node.type !== 'Identifier' || safeStrictReferences.has(node))
            return
          const declaration = scopeTracker.getDeclaration(node.name)
          if (!(declaration instanceof ScopeTrackerImport)
            || (declaration.importNode.source.value !== 'unhead/precompiled/client'
              && declaration.importNode.source.value !== 'unhead/precompiled/server')) {
            return
          }
          if (declaration.importNode.importKind === 'type'
            || (declaration.node.type === 'ImportSpecifier' && declaration.node.importKind === 'type')) {
            return
          }
          if (node.start >= declaration.importNode.start && node.end <= declaration.importNode.end)
            return
          if (declaration.node.type === 'ImportNamespaceSpecifier') {
            const member = parent?.type === 'MemberExpression' && parent.object === node
            const typeMember = parent?.type === 'TSQualifiedName' && parent.left === node
            const propertyName = member ? getMemberName(parent) : typeMember ? parent.right?.name : undefined
            if (propertyName && !PRECOMPILE_FN_NAMES.has(propertyName))
              return
          }
          const isStrictBinding = declaration.node.type === 'ImportNamespaceSpecifier'
            || (declaration.node.type === 'ImportSpecifier'
              && PRECOMPILE_FN_NAMES.has(getModuleExportName(declaration.node.imported) || ''))
          if (isStrictBinding)
            precompileFailure(node, 'strict precompile functions must be called directly and cannot be aliased, exported, or passed as values')
        }

        function validateStrictModuleAccess(node: any): void {
          const isStrictSource = (source: unknown) => source === 'unhead/precompiled/client' || source === 'unhead/precompiled/server'
          if (node.type === 'ExportAllDeclaration'
            && node.exportKind !== 'type'
            && isStrictSource(node.source?.value)) {
            precompileFailure(node, 'the sealed createHead/useHead/useSeoMeta exports cannot be re-exported')
          }
          if (node.type === 'ExportNamedDeclaration'
            && node.exportKind !== 'type'
            && isStrictSource(node.source?.value)
            && node.specifiers.some((specifier: any) =>
              specifier.exportKind !== 'type'
              && PRECOMPILE_FN_NAMES.has(getModuleExportName(specifier.local) || ''),
            )) {
            precompileFailure(node, 'the sealed createHead/useHead/useSeoMeta exports cannot be re-exported')
          }
          if (node.type === 'ImportExpression' && isStrictSource(node.source?.value))
            precompileFailure(node, 'the sealed server entry must use a static import so every head call can be compiled')
          if (node.type === 'TSImportEqualsDeclaration'
            && node.moduleReference?.type === 'TSExternalModuleReference'
            && isStrictSource(node.moduleReference.expression?.value)) {
            precompileFailure(node, 'the sealed server entry must use a static ESM import so every head call can be compiled')
          }
          if (node.type === 'CallExpression'
            && (node.callee?.type === 'Identifier' ? node.callee.name === 'require' : getMemberName(node.callee) === 'require')
            && isStrictSource(node.arguments[0]?.value)) {
            precompileFailure(node, 'the sealed server entry must use a static ESM import so every head call can be compiled')
          }
        }

        function precompileEnter(node: any, parent: any): boolean {
          if (node.type !== 'CallExpression')
            return false

          const resolved = resolvePrecompileFunction(node.callee, scopeTracker)
          if (!resolved?.strict)
            return false
          markStrictCallee(node.callee)
          if (resolved.consumer !== precompileConsumer) {
            precompileFailure(node, `the sealed ${resolved.consumer} entry cannot be used in a ${precompileConsumer} build`)
          }

          if (resolved.kind === 'createHead') {
            if (precompileConsumer === 'client') {
              if (node.arguments.length)
                precompileFailure(node, 'sealed client createHead does not accept options')
              return true
            }
            if (node.arguments.length > 1)
              precompileFailure(node, 'createHead accepts at most one static options object')
            const options = node.arguments[0]
            if (!options) {
              if (precompileConsumer === 'server')
                pendingHeadCreations.push({ start: node.start, end: node.end, disableDefaults: false })
              return true
            }
            if (options.type !== 'ObjectExpression')
              precompileFailure(options, 'createHead options must be a static object literal')
            const decoded = decodeStaticValue(options)
            if (decoded === DECODE_BAIL || Array.isArray(decoded) || decoded === null || typeof decoded !== 'object')
              precompileFailure(options, 'createHead options contain a dynamic or unsupported value')
            for (const [key, value] of Object.entries(decoded)) {
              if (key !== 'disableDefaults' || typeof value !== 'boolean')
                precompileFailure(options, `unsupported createHead option: ${key}`)
            }
            if (precompileConsumer === 'server') {
              pendingHeadCreations.push({
                start: node.start,
                end: node.end,
                disableDefaults: decoded.disableDefaults === true,
              })
            }
            return true
          }

          if (precompileConsumer === 'server' && parent?.type !== 'ExpressionStatement')
            precompileFailure(node, 'the return value cannot be observed; entry patch/dispose handles are not supported')

          const options = node.arguments[1]
          if (!options || options.type !== 'ObjectExpression' || node.arguments.length !== 2)
            precompileFailure(node, 'the second argument must be exactly { head }')
          if (options.properties.length !== 1) {
            precompileFailure(options, 'entry options are not supported; pass only { head }')
          }
          const headProperty = options.properties[0]
          const headKey = headProperty?.key?.type === 'Identifier' || headProperty?.key?.type === 'Literal'
            ? headProperty.key.name ?? headProperty.key.value
            : undefined
          if (headProperty?.type !== 'Property'
            || headProperty.computed
            || !headProperty.shorthand
            || headKey !== 'head'
            || headProperty.value?.type !== 'Identifier'
            || headProperty.value.name !== 'head') {
            precompileFailure(options, 'the second argument must be exactly { head }')
          }

          const arg = node.arguments[0]
          if (!arg || arg.type !== 'ObjectExpression')
            precompileFailure(node, 'the head input must be a static object literal')
          const decoded = decodeStaticValue(arg)
          if (decoded === DECODE_BAIL || Array.isArray(decoded) || decoded === null || typeof decoded !== 'object')
            precompileFailure(arg, 'the head input contains a dynamic or unsupported value')

          const name = `${precompilePrefix}_plan_${pendingPrecompilations.length}`
          pendingPrecompilations.push({
            consumer: precompileConsumer!,
            start: node.start,
            end: node.end,
            head: headProperty.value.name,
            name,
            source: (precompileConsumer === 'server' ? compileStaticInput : compileStaticClientInput)(
              decoded as Record<string, DecodedStaticValue>,
              resolved.kind,
              minifyEligible,
              reason => precompileFailure(arg, reason),
            ),
          })
          precompiledRanges.push([node.start, node.end])
          return true
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
            if (runPrecompile)
              validateStrictModuleAccess(node)
            // Anything inside a claimed range has already been handled by an
            // earlier phase and must not receive nested edits.
            if (removedRanges.length && inRemovedRange(node))
              return
            if (precompiledRanges.length && inPrecompiledRange(node))
              return

            // Phase order per call site is load-bearing: server-composable
            // removal first, then seoMeta lowering/precompile, then static
            // minification. A fully static useSeoMeta call folds its lowering
            // directly into the precompiled marker.
            if (runTreeshake && treeshakeEnter(node, parent))
              return
            if (runPrecompile) {
              if (precompileEnter(node, parent))
                return
              validateStrictReference(node, parent)
            }
            if (runSeoMeta)
              seoMetaEnter(node, parent)
            if (runMinify)
              minifyEnter(node)
          },
        })

        if (runSeoMeta)
          seoMetaFinalize()

        const defaultPlanName = `${precompilePrefix}_defaults`
        for (const pending of pendingHeadCreations) {
          edits.push({
            start: pending.start,
            end: pending.end,
            content: pending.disableDefaults ? '({_p:[]})' : `({_p:[${defaultPlanName}]})`,
            phase: 'precompile',
          })
        }

        let compiledPlans: string[] = []
        if (pendingPrecompilations.length) {
          compiledPlans = await Promise.all(pendingPrecompilations.map(pending => pending.source))
          for (let i = 0; i < pendingPrecompilations.length;) {
            const first = pendingPrecompilations[i]
            if (first.consumer === 'client') {
              edits.push({
                start: first.start,
                end: first.end,
                content: `${first.head}.push(${first.name})`,
                phase: 'precompile',
              })
              i++
              continue
            }
            let last = first
            const indexes = [i]
            while (++i < pendingPrecompilations.length) {
              const next = pendingPrecompilations[i]
              if (next.consumer !== 'server' || next.head !== first.head || !/^[;\s]*$/.test(code.slice(last.end, next.start)))
                break
              last = next
              indexes.push(i)
            }
            if (indexes.length > 1) {
              compiledPlans[indexes[0]] = `[${indexes
                .map(index => compiledPlans[index].slice(1, -1))
                .filter(Boolean)
                .join(',')}]`
              for (const index of indexes.slice(1))
                compiledPlans[index] = ''
            }
            edits.push({
              start: first.start,
              end: last.end,
              content: `${first.head}._p.push(${first.name})`,
              phase: 'precompile',
            })
          }
        }

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
        if (pendingPrecompilations.length || pendingHeadCreations.some(pending => !pending.disableDefaults)) {
          const directives = ast.program.body.filter((node: any) => node.type === 'ExpressionStatement' && node.directive)
          const directiveEnd = directives.at(-1)?.end
          const importOffset = directiveEnd ?? (code.startsWith('#!') ? code.indexOf('\n') + 1 : 0)
          const declarations = [
            ...(pendingHeadCreations.some(pending => !pending.disableDefaults)
              ? [`const ${defaultPlanName} = ${JSON.stringify(PRECOMPILED_DEFAULT_PLAN)}`]
              : []),
            ...pendingPrecompilations
              .flatMap((pending, index) => compiledPlans[index] ? [`const ${pending.name} = ${compiledPlans[index]}`] : []),
          ].join('\n')
          s.appendLeft(importOffset, `${directiveEnd === undefined ? '' : '\n'}${declarations}\n`)
        }

        if (!s.hasChanged())
          return

        return {
          code: s.toString(),
          map: s.generateMap({ includeContent: true, source: id }) as SourceMapInput,
        }
      },
    },
    webpack(ctx) {
      fallbackConsumer ??= ctx.name === 'server' ? 'server' : 'client'
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
          return !!seoMetaOpts || !!precompileOpts || !!minifyOpts
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
    consumer: options.consumer,
    treeshake: options.treeshake ?? false,
    seoMeta: options.seoMeta ?? false,
    precompile: options.precompile ?? false,
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
    if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value)))
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
      || typeof arg.value !== 'number'
      || !Number.isFinite(arg.value)) {
      return DECODE_BAIL
    }
    const value = node.operator === '-' ? -arg.value : arg.value
    return Object.is(value, -0) ? DECODE_BAIL : value
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
    // Unsafe prototype keys are rejected below, so ordinary objects are safe
    // here and retain runtime String(value) behavior for nested attribute values.
    const out: Record<string, DecodedStaticValue> = {}
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
