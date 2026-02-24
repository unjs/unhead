import type { SourceMapInput } from 'rollup'
import type { BaseTransformerTypes } from './types'
import { pathToFileURL } from 'node:url'
import { createContext, runInContext } from 'node:vm'
import MagicString from 'magic-string'
import { parseSync } from 'oxc-parser'
import { ScopeTracker, ScopeTrackerImport, walk } from 'oxc-walker'
import { parseQuery, parseURL } from 'ufo'
import {
  resolveMetaKeyType,
  resolveMetaKeyValue,
  resolvePackedMetaObjectValue,
} from 'unhead/utils'
import { createUnplugin } from 'unplugin'

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

const SEO_META_NAMES = new Set(['useSeoMeta', 'useServerSeoMeta'])

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
  options.imports = options.imports || true

  function isValidPackage(s: string) {
    if (s === 'unhead' || s.startsWith('@unhead')) {
      return true
    }
    return [...(options.importPaths || [])].includes(s)
  }

  return {
    name: 'unhead:use-seo-meta-transform',
    enforce: 'post',

    transformInclude(id) {
      const { pathname, search } = parseURL(decodeURIComponent(pathToFileURL(id).href))
      const { type } = parseQuery(search)

      if (pathname.match(/[\\/]node_modules[\\/]/))
        return false

      // Included
      if (options.filter?.include?.some(pattern => id.match(pattern)))
        return true

      // Excluded
      if (options.filter?.exclude?.some(pattern => id.match(pattern)))
        return false

      // vue files
      if (pathname.endsWith('.vue') && (type === 'script' || !search))
        return true

      // js files
      if (pathname.match(/\.((c|m)?j|t)sx?$/g))
        return true

      return false
    },

    async transform(code, id) {
      if (!code.includes('useSeoMeta') && !code.includes('useServerSeoMeta'))
        return

      const scopeTracker = new ScopeTracker()
      const ast = parseSync(id, code)
      const s = new MagicString(code)

      // Track which ImportDeclarations need specifier rewrites
      // Key: ImportDeclaration node, Value: set of original imported names that were transformed
      const importRewrites = new Map<any, Set<string>>()
      // Track if seoMeta is referenced as a value (not just called), keyed by original imported name
      const valueReferenced = new Set<string>()

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
            if (!isValidPackage(decl.importNode.source.value))
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
          if (!properties)
            return

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
              output.push('});')
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
            let key = resolveMetaKeyType(propertyKey.name)
            const keyValue = resolveMetaKeyValue(propertyKey.name)
            let valueKey = 'content'
            if (keyValue === 'charset') {
              valueKey = 'charset'
              key = 'charset'
            }
            let value = code.substring(property.value.start as number, property.value.end as number)
            if (property.value.type === 'ArrayExpression') {
              if (output === false)
                return

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
              const isStatic = property.value.properties.every((p: any) => p.value.type === 'StringLiteral' && typeof p.value.value === 'string')
              if (!isStatic) {
                output = false
                return
              }
              const context = createContext({
                resolvePackedMetaObjectValue,
              })
              const start = property.value.start as number
              const end = property.value.end as number
              try {
                value = JSON.stringify(runInContext(`resolvePackedMetaObjectValue(${code.slice(start, end)})`, context))
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
            output.push('})')
            s.overwrite(node.start, node.end, output.join('\n'))

            // Track import for rewriting
            if (importDecl) {
              if (!importRewrites.has(importDecl))
                importRewrites.set(importDecl, new Set())
              importRewrites.get(importDecl)!.add(originalName)
            }
          }
        },
      })

      // Rewrite import specifiers
      if (options.imports && importRewrites.size > 0) {
        for (const [importNode, transformedNames] of importRewrites) {
          const newSpecifiers = new Set<string>()
          for (const spec of importNode.specifiers) {
            if (spec.type !== 'ImportSpecifier')
              continue
            const importedName = spec.imported.name
            if (transformedNames.has(importedName)) {
              newSpecifiers.add(importedName.includes('Server') ? 'useServerHead' : 'useHead')
              // Keep original import if it's still referenced as a value
              if (valueReferenced.has(importedName))
                newSpecifiers.add(importedName)
            }
            else {
              newSpecifiers.add(importedName)
            }
          }
          s.overwrite(
            importNode.specifiers[0].start,
            importNode.specifiers[importNode.specifiers.length - 1].end,
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
  }
})
