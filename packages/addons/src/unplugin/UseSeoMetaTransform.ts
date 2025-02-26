import type { ImportDeclaration, ObjectProperty } from '@babel/types'
import type { SimpleCallExpression } from 'estree'
import type { Node } from 'estree-walker'
import type { SourceMapInput } from 'rollup'
import type { BaseTransformerTypes } from './types'
import { pathToFileURL } from 'node:url'
import { createContext, runInContext } from 'node:vm'
import { walk } from 'estree-walker'
import MagicString from 'magic-string'
import { findStaticImports, parseStaticImport } from 'mlly'
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

      // // useSeoMeta may be auto-imported or may not be
      const statements = findStaticImports(code).filter(i => isValidPackage(i.specifier))
      const importNames: Record<string, string> = {}
      for (const i of statements.flatMap(i => parseStaticImport(i))) {
        if (i.namedImports) {
          for (const key in i.namedImports) {
            if (key === 'useSeoMeta' || key === 'useServerSeoMeta')
              importNames[i.namedImports[key]] = key
          }
        }
        // note: namespaced imports are not supported
      }

      const ast = this.parse(code)
      const s = new MagicString(code)
      let replacementPayload: ((f: boolean) => [number, number, string]) | undefined
      let replaceCount = 0
      let totalCount = 0
      walk(ast as Node, {
        enter(_node) {
          if (options.imports && _node.type === 'ImportDeclaration' && isValidPackage(_node.source.value as string)) {
            const node = _node as unknown as ImportDeclaration
            const hasSeoMeta = node.specifiers.some(s =>
              s.type === 'ImportSpecifier'
              && ['useSeoMeta', 'useServerSeoMeta'].includes((s.imported as any).name),
            )

            if (!hasSeoMeta) {
              return
            }

            // Count how many specifiers we're removing
            const toImport = new Set()
            node.specifiers.forEach((spec) => {
              if (spec.type === 'ImportSpecifier'
                && ['useSeoMeta', 'useServerSeoMeta'].includes((spec.imported as any).name)) {
                toImport.add((spec.imported as any).name.includes('Server') ? 'useServerHead' : 'useHead')
              }
              else {
                toImport.add((spec.imported as any).name)
              }
            })
            if (toImport.size) {
              // need to modify current node imports
              replacementPayload = (useSeoMeta = false) => [node.specifiers[0].start, node.specifiers[node.specifiers.length - 1].end, [...toImport, useSeoMeta ? 'useSeoMeta' : false].filter(Boolean).join(', ')]
            }
          }
          else if (
            _node.type === 'CallExpression'
            && _node.callee.type === 'Identifier'
            && Object.keys({
              useSeoMeta: 'useSeoMeta',
              useServerSeoMeta: 'useServerSeoMeta',
              ...importNames,
            }).includes(_node.callee.name)) {
            replaceCount++
            const node = _node as SimpleCallExpression

            const calleeName = importNames[(node.callee as any).name] || (node.callee as any).name

            // @ts-expect-error untyped
            const properties = node.arguments[0].properties as ObjectProperty[]
            if (!properties)
              return

            // properties is currently an AST object of key => values, we need to transform it to an array of key => values instead
            // and change the key names to 'name' and 'content'
            let output: string[] | false = []
            // need to split the title and titleTemplate into a useHead and meta into useServerHead
            // @ts-expect-error untyped
            const title = properties.find(property => property.key?.name === 'title')
            // @ts-expect-error untyped
            const titleTemplate = properties.find(property => property.key?.name === 'titleTemplate')
            // @ts-expect-error untyped
            const meta = properties.filter(property => property.key?.name !== 'title' && property.key?.name !== 'titleTemplate')
            if (title || titleTemplate || calleeName === 'useSeoMeta') {
              output.push('useHead({')
              if (title) {
                // @ts-expect-error untyped
                output.push(`  title: ${code.substring(title.value.start, title.value.end)},`)
              }
              if (titleTemplate) {
                // @ts-expect-error untyped
                output.push(`  titleTemplate: ${code.substring(titleTemplate.value.start, titleTemplate.value.end)},`)
              }
            }
            if (calleeName === 'useServerSeoMeta') {
              if (output.length)
                output.push('});')
              output.push('useServerHead({')
            }

            if (meta.length)
              output.push('  meta: [')

            meta.forEach((property) => {
              // not supported
              // @ts-expect-error untyped
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
              // store the AST object in meta
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

                // For each array element
                const metaTags = elements.map((element) => {
                  // If not an object, handle as a simple value
                  if (element.type !== 'ObjectExpression')
                    return `    { ${key}: '${keyValue}', ${valueKey}: ${code.substring(element.start, element.end)} },`

                  // Transform object properties to meta tags
                  return element.properties.map((p: any) => {
                    const propKey = p.key.name
                    const propValue = code.substring(p.value.start, p.value.end)
                    return `    { ${key}: '${keyValue}:${propKey}', ${valueKey}: ${propValue} },`
                  }).join('\n')
                })

                output.push(metaTags.join('\n'))
                return
              }
              // value may be an object, in which case we need to stringify it, this may be a problem if the object is reactive
              else if (property.value.type === 'ObjectExpression') {
                // make sure all of the entries are static strings
                // @ts-expect-error untyped
                const isStatic = property.value.properties.every(p => p.value.type === 'Literal' && typeof p.value.value === 'string')
                if (!isStatic) {
                  output = false
                  return
                }
                // we need to run this code with the stringify function, needs to run in its own context
                const context = createContext({
                  resolvePackedMetaObjectValue,
                })
                const start = property.value.start as number
                const end = property.value.end as number
                try {
                  value = JSON.stringify(runInContext(`resolvePackedMetaObjectValue(${code.slice(start, end)})`, context))
                }
                catch {
                  // failed for some reason, possibly reactivity issue, abort to runtime
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
              // @ts-expect-error untyped
              s.overwrite(node.start, node.end, output.join('\n'))
            }
          }
          else if (_node.type === 'Identifier'
            && ['useSeoMeta', 'useServerSeoMeta'].includes(_node.name)) {
            totalCount++
          }
        },
      })

      if (s.hasChanged()) {
        if (replacementPayload) {
          // only if we swapped out useSeoMeta
          s.overwrite(...replacementPayload(replaceCount + 3 === totalCount))
        }

        return {
          code: s.toString(),
          map: s.generateMap({ includeContent: true, source: id }) as SourceMapInput,
        }
      }
    },
  }
})
