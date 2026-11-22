import type { Plugin } from 'vite'
import type { VitePluginOptions } from './types'
import { readFile } from 'node:fs/promises'
import { dirname, isAbsolute, resolve } from 'node:path'

export function ClientFeatureTreeshake(options: VitePluginOptions['treeshake']): Plugin[] {
  const client = options && options.client
  const domEvents = !client || client.domEvents !== false
  const titleTemplate = !client || client.titleTemplate !== false
  if (domEvents && titleTemplate)
    return []

  let streaming = false
  return [{
    name: 'unhead:client-feature-treeshake',
    apply: 'build',
    enforce: 'pre',
    configResolved(config) {
      // Nuxt emits the streaming bootstrap in a separate asset.
      streaming = config.plugins.some(plugin => plugin.name === 'nuxt:streaming-iife-chunk')
    },
    applyToEnvironment({ name, config }) {
      return !streaming && name === 'client' && config.consumer === 'client' && !config.build.watch && !config.build.lib
    },
    async load(id) {
      if (!id.endsWith('/dist/client-features.mjs') || !isAbsolute(id))
        return
      const manifest = await readFile(resolve(dirname(id), '../package.json'), 'utf8').catch((error: NodeJS.ErrnoException) => {
        // An unrelated module may have the same file name.
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR')
          return undefined
        throw error
      })
      if (manifest && JSON.parse(manifest)?.name === 'unhead')
        return `export const domEvents = ${domEvents}; export const titleTemplate = ${titleTemplate};`
    },
  }]
}
