import type { Plugin } from 'vite'
import MagicString from 'magic-string'
import { parseAndWalk } from 'oxc-walker'

const HEAD_FACTORIES = ['createHead']
const FILE_RE = /\.(vue|tsx?|jsx?|svelte)$/

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
        if (!HEAD_FACTORIES.some(f => code.includes(f)))
          return

        const isServer = this.environment?.config?.consumer === 'server'
        const envRegistrations = registrations.filter(r => isServer ? r.server : r.client)
        if (!envRegistrations.length)
          return

        const s = new MagicString(code)
        let transformed = false

        parseAndWalk(code, id, {
          parseOptions: { lang: 'ts' },
          enter(node: any) {
            if (node.type !== 'CallExpression')
              return
            const callee = node.callee
            if (!callee)
              return

            const name = callee.type === 'Identifier'
              ? callee.name
              : callee.type === 'MemberExpression' && callee.property?.type === 'Identifier'
                ? callee.property.name
                : null

            if (!name || !HEAD_FACTORIES.includes(name))
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
