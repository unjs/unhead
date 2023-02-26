import { pathToFileURL } from 'node:url'
import { createContext, runInContext } from 'node:vm'
import { createUnplugin } from 'unplugin'
import { MetaPackingSchema, fixKeyCase, resolveMetaKeyType, resolvePackedMetaObjectValue } from 'unhead'
import { parseQuery, parseURL } from 'ufo'
import type { ObjectProperty } from '@babel/types'
import MagicString from 'magic-string'
import type { SourceMapInput } from 'rollup'
import type { Node } from 'estree-walker'
import { walk } from 'estree-walker'
import type { SimpleCallExpression } from 'estree'
import { findStaticImports, parseStaticImport } from 'mlly'

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
export const UseSeoMetaTransform = createUnplugin(() => {
  return {
    name: 'unhead:use-seo-meta-transform',
    enforce: 'post',

    transformInclude(id) {
      const { pathname, search } = parseURL(decodeURIComponent(pathToFileURL(id).href))
      const { type } = parseQuery(search)

      if (pathname.includes('node_modules'))
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
      const packages = ['unhead', '@unhead/vue', 'unhead']
      const statements = findStaticImports(code).filter(i => packages.includes(i.specifier))
      const importNames = {}
      for (const i of statements.flatMap(i => parseStaticImport(i))) {
        if (i.namedImports) {
          for (const key in i.namedImports)
            importNames[i.namedImports[key]] = key
        }
        // note: namespaced imports are not supported
      }

      const ast = this.parse(code)
      const s = new MagicString(code)
      const extraImports = new Set()
      walk(ast as Node, {
        enter(_node) {
          if (_node.type === 'ImportDeclaration' && packages.includes(_node.source.value)) {
            // make sure we are using seo meta
            if (!_node.specifiers.some(s => s.type === 'ImportSpecifier' && ['useSeoMeta', 'useServerSeoMeta'].includes(s.imported?.name)))
              return

            const imports = Object.values(importNames)
            // add useHead and useServerHead if they are not already imported
            if (!imports.includes('useHead'))
              extraImports.add(`import { useHead } from '${_node.source.value}'`)

            if (!imports.includes('useServerHead') && imports.includes('useServerSeoMeta'))
              extraImports.add(`import { useServerHead } from '${_node.source.value}'`)
          }
          else if (
            _node.type === 'CallExpression'
            && _node.callee.type === 'Identifier'
            && Object.keys({
              useSeoMeta: 'useSeoMeta',
              useServerSeoMeta: 'useServerSeoMeta',
              ...importNames,
            }).includes(_node.callee.name)) {
            const node = _node as SimpleCallExpression

            const calleeName = importNames[(node.callee as any).name] || (node.callee as any).name

            const properties = node.arguments[0].properties as ObjectProperty[]
            if (!properties)
              return

            // properties is currently an AST object of key => values, we need to transform it to an array of key => values instead
            // and change the key names to 'name' and 'content'
            let output: string[] | false = []
            // need to split the title and titleTemplate into a useHead and meta into useServerHead
            const title = properties.find(property => property.key.name === 'title')
            const titleTemplate = properties.find(property => property.key.name === 'titleTemplate')
            const meta = properties.filter(property => property.key.name !== 'title' && property.key.name !== 'titleTemplate')
            if (title || titleTemplate || calleeName === 'useSeoMeta') {
              output.push('useHead({')
              if (title)
                output.push(`  title: ${code.substring(title.value.start, title.value.end)},`)
              if (titleTemplate)
                output.push(`  titleTemplate: ${code.substring(titleTemplate.value.start, titleTemplate.value.end)},`)
            }
            if (calleeName === 'useServerSeoMeta') {
              if (output.length)
                output.push('});')
              output.push('useServerHead({')
            }
            if (meta.length) {
              output.push('  meta: [')
            }
            meta.forEach((property) => {
              if (output === false)
                return
              // store the AST object in meta
              const key = resolveMetaKeyType(property.key.name)
              const keyValue = MetaPackingSchema[property.key.name]?.keyValue || fixKeyCase(property.key.name)
              const valueKey = key === 'charset' ? 'charset' : 'content'
              let value = code.substring(property.value.start, property.value.end)
              if (property.value.type === 'ArrayExpression') {
                // @todo add support for og:image arrays
                output = false
                return
              }
              // value may be an object, in which case we need to stringify it, this may be a problem if the object is reactive
              else if (property.value.type === 'ObjectExpression') {
                // make sure all of the entries are static strings
                const isStatic = property.value.properties.every(property => property.value.type === 'Literal' && typeof property.value.value === 'string')
                if (!isStatic) {
                  output = false
                  return
                }
                // we need to run this code with the stringify function, needs to run in its own context
                const context = createContext({
                  resolvePackedMetaObjectValue,
                })
                const start = property.value.start
                const end = property.value.end
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
              s.overwrite(node.start, node.end, output.join('\n'))
            }
          }
        },
      })

      if (s.hasChanged()) {
        // only if we swapped out useSeoMeta
        const prependImports = [...extraImports]
        if (prependImports.length)
          s.prepend(`${prependImports.join('\n')}\n`)

        return {
          code: s.toString(),
          map: s.generateMap({ includeContent: true, source: id }) as SourceMapInput,
        }
      }
    },
  }
})
