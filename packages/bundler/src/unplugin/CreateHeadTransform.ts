import type { Plugin } from 'vite'
import MagicString from 'magic-string'
import { parseAndWalk } from 'oxc-walker'

const FILE_RE = /\.(vue|tsx?|jsx?|svelte)$/
const UNHEAD_SOURCE_RE = /^(?:@unhead\/[^/]+|unhead)(?:\/[^?]*)?$/

export interface RuntimePluginRegistration {
  /** Import to inject */
  import: { name: string, source: string, as: string }
  /** Expression using `_h` (the head instance). Only emitted in client builds. */
  client?: string
  /** Expression using `_h` (the head instance). Only emitted in server builds. */
  server?: string
}

export interface HeadTransformContext {
  addRuntimePlugin: (reg: RuntimePluginRegistration) => void
  getRegistrations: () => RuntimePluginRegistration[]
}

export function createHeadTransformContext(): HeadTransformContext {
  const registrations: RuntimePluginRegistration[] = []
  return {
    addRuntimePlugin(reg) {
      registrations.push(reg)
    },
    getRegistrations() {
      return registrations
    },
  }
}

export function CreateHeadTransform(ctx: HeadTransformContext): Plugin {
  let root = ''

  return {
    name: '@unhead/create-head-transform',
    apply: 'serve',

    configResolved(config) {
      root = config.root
    },

    transform: {
      filter: { id: FILE_RE },
      handler(code, id) {
        const registrations = ctx.getRegistrations()
        if (!registrations.length)
          return
        if (!code.includes('createHead'))
          return

        const isServer = this.environment?.config?.consumer === 'server'
        const envRegistrations = registrations.filter(r => isServer ? r.server : r.client)
        if (!envRegistrations.length)
          return

        const s = new MagicString(code)
        let transformed = false
        const directCreateHeadNames = new Set<string>()
        const namespaceNames = new Set<string>()

        parseAndWalk(code, id, {
          parseOptions: { lang: 'ts' },
          enter(node: any) {
            if (node.type === 'ImportDeclaration') {
              const source = node.source?.value
              if (typeof source !== 'string' || !UNHEAD_SOURCE_RE.test(source))
                return
              for (const spec of node.specifiers || []) {
                if (spec.type === 'ImportSpecifier' && spec.imported?.name === 'createHead')
                  directCreateHeadNames.add(spec.local.name)
                else if (spec.type === 'ImportNamespaceSpecifier')
                  namespaceNames.add(spec.local.name)
              }
              return
            }
            if (node.type !== 'CallExpression')
              return
            const callee = node.callee
            if (!callee)
              return

            const isDirect = callee.type === 'Identifier' && directCreateHeadNames.has(callee.name)
            const isNamespaced = callee.type === 'MemberExpression'
              && callee.object?.type === 'Identifier'
              && namespaceNames.has(callee.object.name)
              && callee.property?.type === 'Identifier'
              && callee.property.name === 'createHead'
            if (!isDirect && !isNamespaced)
              return

            const statements = envRegistrations
              .map(r => (isServer ? r.server! : r.client!).replace(/__ROOT__/g, JSON.stringify(root)))
              .join(',')

            s.prependLeft(node.start, `((_h)=>(${statements},_h))(`)
            s.appendRight(node.end, `)`)
            transformed = true
          },
        })

        if (!transformed)
          return

        for (const reg of envRegistrations) {
          s.prepend(`import { ${reg.import.name} as ${reg.import.as} } from '${reg.import.source}';\n`)
        }

        return {
          code: s.toString(),
          map: s.generateMap({ includeContent: true, source: id }),
        }
      },
    },
  }
}
