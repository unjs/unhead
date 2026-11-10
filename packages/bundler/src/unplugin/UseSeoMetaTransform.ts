import type { SourceMapInput } from 'rollup'
import type { ConfigEnv, UserConfig } from 'vite'
import type { BaseTransformerTypes } from './types'
import type { BuildConsumer } from './utils'
import MagicString from 'magic-string'
import { ScopeTracker, ScopeTrackerImport, walk } from 'oxc-walker'
import {
  resolveMetaKeyType,
  resolveMetaKeyValue,
  resolvePackedMetaObjectValue,
} from 'unhead/utils'
import { createUnplugin } from 'unplugin'
import { parseAndWalkSource } from './parser'
import { createJsVueTransformIdFilter, isVueScriptRequest, JS_EXT_RE, NODE_MODULES_RE, resolveBuildConsumer, splitTransformId } from './utils'

const SEO_META_RE = /\buse(?:Server)?SeoMeta\b/

export interface UseSeoMetaTransformOptions extends BaseTransformerTypes {
  /**
   * Whether to transform imports of `useSeoMeta` and `useServerSeoMeta` to `useHead` and `useServerHead`.
   */
  imports?: boolean
  /**
   * Extra import paths to consider where `useSeoMeta()` may be imported from.
   */
  importPaths?: string[]
  /**
   * Adds the `seoMeta: true` entry option to each `useHead` call a server build writes, so
   * `readEntry` reports the entry as the `useSeoMeta` call it was. The `compile` option sets it.
   *
   * @internal
   */
  markEntries?: boolean
}

const SEO_META_NAMES = new Set(['useSeoMeta', 'useServerSeoMeta'])

// Keys whose runtime value is structurally expanded into multiple meta tags based on its shape
// (e.g. `ogImage: { url, width }` -> `og:image` + `og:image:width`). See `unpackMeta` MEDIA branch.
// We can only reproduce this statically for object/array literals; any dynamic value (ref, computed,
// getter, identifier) could resolve to an object and MUST be left to runtime `unpackMeta`.
const MEDIA_KEYS = new Set(['ogImage', 'ogVideo', 'ogAudio', 'twitterImage'])

/**
 * useSeoMeta({
 *   title: 'My Title',
 *   titleTemplate: '%s | My Site',
 *   description: 'My Description',
 * })
 * ->
 * useHead({
 *  title: 'My Title',
 *  titleTemplate: '%s | My Site',
 *  meta: [
 *    { name: 'description', content: 'My Description' },
 *  ],
 * })
 */
export const UseSeoMetaTransform = createUnplugin<UseSeoMetaTransformOptions, false>((options: UseSeoMetaTransformOptions = {}) => {
  const rewriteImports = options.imports ?? true
  const importPaths = options.importPaths?.length ? new Set(options.importPaths) : undefined
  let fallbackConsumer: BuildConsumer | undefined

  function isValidPackage(s: string) {
    if (s === 'unhead' || s.startsWith('@unhead')) {
      return true
    }
    return importPaths?.has(s) === true
  }

  function shouldTransformId(id: string): boolean {
    const { pathname, query } = splitTransformId(id)

    if (NODE_MODULES_RE.test(pathname))
      return false

    // Excluded
    if (options.filter?.exclude?.some(pattern => id.match(pattern)))
      return false

    // Included
    if (options.filter?.include?.some(pattern => id.match(pattern)))
      return true

    // vue files
    if (isVueScriptRequest(pathname, query))
      return true

    // js files
    if (JS_EXT_RE.test(pathname))
      return true

    return false
  }

  return {
    name: 'unhead:use-seo-meta-transform',
    enforce: 'post',

    transform: {
      filter: {
        code: SEO_META_RE,
        id: createJsVueTransformIdFilter(options.filter?.include),
      },
      async handler(code, id) {
        // `filter.id` admits `.vue` sub-requests of any block type, and it
        // cannot express the caller's `filter.exclude`, so the id still needs
        // a second look. `filter.code` already guaranteed `useSeoMeta`.
        if (!shouldTransformId(id))
          return

        // a client head takes the marker as an entry option, so only a server build writes it
        const marks = options.markEntries && resolveBuildConsumer(this, fallbackConsumer) === 'server'
        const scopeTracker = new ScopeTracker({ preserveExitedScopes: true })
        const ast = parseAndWalkSource(code, id, { scopeTracker })
        const s = new MagicString(code)

        // The parse walk collected all declarations, including hoisted locals.
        scopeTracker.freeze()

        // Track which ImportDeclarations need specifier rewrites
        // Key: ImportDeclaration node, Value: set of original imported names that were transformed
        const importRewrites = new Map<any, Set<string>>()
        // Track if seoMeta is referenced as a value (not just called), keyed by original imported name
        const valueReferenced = new Set<string>()
        // Track useSeoMeta/useServerSeoMeta calls that could not be transformed (e.g. dynamic first
        // arg, spread properties). The original import must be preserved alongside the useHead rewrite.
        const untransformedCallees = new Set<string>()

        walk(ast.program, {
          scopeTracker,
          enter(node: any, parent: any) {
          // Track value references to seoMeta identifiers (e.g., console.log(useSeoMeta))
          // Skip: call callees (handled below), import specifiers (definitions, not references)
            if (node.type === 'Identifier'
              && !(parent?.type === 'CallExpression' && parent.callee === node)
              && parent?.type !== 'ImportSpecifier') {
              const decl = scopeTracker.getDeclaration(node.name)
              if (decl instanceof ScopeTrackerImport
                && isValidPackage(decl.importNode.source.value)
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
              if (!isValidPackage(decl.importNode.source.value) || decl.node.type !== 'ImportSpecifier' || decl.node.imported.type !== 'Identifier')
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

            // The second argument (options like { head }) goes to each call this one becomes. An
            // object literal takes the marker in place, so the compile transform still reads its
            // `head`. A spread argument is a list, and the options are its first item.
            const optionsNode = node.arguments[1]
            const optionsArg = optionsNode && code.substring(optionsNode.start, optionsNode.end)
            const entryOptions = !marks
              ? optionsArg
              : !optionsNode
                  ? '{ seoMeta: true }'
                  : optionsNode.type === 'SpreadElement'
                    ? `{ ...[${optionsArg}][0], seoMeta: true }`
                    : optionsNode.type !== 'ObjectExpression'
                      ? `{ ...${optionsArg}, seoMeta: true }`
                      : optionsNode.properties.length
                        ? `${code.substring(optionsNode.start, optionsNode.properties.at(-1).end)}, seoMeta: true }`
                        : '{ seoMeta: true }'
            const close = entryOptions ? `}, ${entryOptions})` : '})'

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
              if (output.length)
                output.push(`${close};`)
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
              output.push(close)
              s.overwrite(node.start, node.end, output.join('\n'))

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
          },
        })

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
            s.overwrite(
              importNode.specifiers[0].start,
              importNode.specifiers.at(-1).end,
              [...newSpecifiers].join(', '),
            )
          }
        }

        if (s.hasChanged()) {
          return {
            code: s.toString(),
            map: s.generateMap({ includeContent: true, source: id }) as SourceMapInput,
          }
        }
      },
    },
    // a bundler with no Environment API tells the build target here
    ...options.markEntries && {
      webpack(ctx) {
        fallbackConsumer = ctx.name === 'server' ? 'server' : 'client'
      },
      vite: {
        apply(_config: UserConfig, env: ConfigEnv) {
          fallbackConsumer = env.isSsrBuild ? 'server' : 'client'
          return true
        },
      },
    },
  }
})

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
