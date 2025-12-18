import MagicString from 'magic-string'

export interface VitePlugin {
  name: string
  enforce?: 'pre' | 'post'
  transform?: (code: string, id: string, options?: { ssr?: boolean }) => { code: string, map: any } | null | undefined
}

export interface UnheadPluginOptions {
  include?: RegExp
  exclude?: RegExp
  debug?: boolean
  /**
   * Only transform files that contain useHead import.
   * @default true
   */
  onlyWithUseHead?: boolean
}

export interface UnheadPluginContext {
  code: string
  id: string
  isSSR: boolean
  s: MagicString
  onlyWithUseHead: boolean
}

export interface CreateUnheadPluginConfig {
  name: string
  defaultInclude: RegExp
  quickCheck: (code: string) => boolean
  transform: (ctx: UnheadPluginContext) => boolean
}

export function createUnheadPlugin(
  config: CreateUnheadPluginConfig,
  options: UnheadPluginOptions = {},
): VitePlugin {
  const {
    include = config.defaultInclude,
    exclude,
    debug = false,
    onlyWithUseHead = true,
  } = options

  return {
    name: config.name,
    enforce: 'pre',

    transform(code, id, transformOptions) {
      const isSSR = transformOptions?.ssr ?? false

      if (!include.test(id))
        return null
      if (exclude?.test(id))
        return null
      if (!config.quickCheck(code))
        return null
      if (code.includes('HeadStream'))
        return null

      const s = new MagicString(code)
      const ctx: UnheadPluginContext = { code, id, isSSR, s, onlyWithUseHead }

      const transformed = config.transform(ctx)
      if (!transformed)
        return null

      if (debug)
        console.warn(`[${config.name}] Transformed ${id}`)

      return {
        code: s.toString(),
        map: s.generateMap({ includeContent: true, source: id }),
      }
    },
  }
}
