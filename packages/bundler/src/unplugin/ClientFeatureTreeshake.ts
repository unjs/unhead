import type { Plugin } from 'vite'
import type { VitePluginOptions } from './types'
import { readFile } from 'node:fs/promises'
import { dirname, isAbsolute, resolve } from 'node:path'
import { collectHeadUsage } from './clientHeadUsage'

type ClientFeatures = NonNullable<ReturnType<typeof collectHeadUsage>>
type Inventory = { _tag: 'complete', used: ClientFeatures } | { _tag: 'unknown', reason: string }

interface ParsedModule {
  dependencies: string[]
  used: ClientFeatures | undefined
}

interface ClientGraph {
  reachable: Set<string>
  pending: Set<string>
  parsed: Map<string, ParsedModule>
  defaults: Set<string>
  onProgress?: () => void
  selection?: Promise<Inventory>
}

const scanIdleTimeout = 2000

function visit(graph: ClientGraph, ids: string[]) {
  const queue = [...ids]
  while (queue.length) {
    const id = queue.pop()!
    if (graph.reachable.has(id))
      continue
    graph.reachable.add(id)
    if (graph.defaults.has(id))
      continue
    const module = graph.parsed.get(id)
    if (module)
      queue.push(...module.dependencies)
    else
      graph.pending.add(id)
  }
}

function inventory(graph: ClientGraph): Inventory {
  if (graph.pending.size)
    return { _tag: 'unknown', reason: 'The client module graph could not be verified' }
  const used = { domEvents: false, titleTemplate: false }
  for (const id of graph.reachable) {
    if (graph.defaults.has(id))
      continue
    const module = graph.parsed.get(id)
    if (!module?.used)
      return { _tag: 'unknown', reason: `Could not inspect useHead calls in ${id}` }
    used.domEvents ||= module.used.domEvents
    used.titleTemplate ||= module.used.titleTemplate
  }
  return { _tag: 'complete', used }
}

function waitForInventory(graph: ClientGraph): Promise<Inventory> {
  if (!graph.pending.size)
    return Promise.resolve(inventory(graph))

  // The defaults module waits while Rolldown parses the rest of the graph.
  // Other plugins can wait for the defaults too, so keep support if scanning stalls.
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout>
    const finish = () => {
      clearTimeout(timer)
      graph.onProgress = undefined
      resolve(inventory(graph))
    }
    graph.onProgress = () => {
      clearTimeout(timer)
      if (graph.pending.size)
        timer = setTimeout(finish, scanIdleTimeout)
      else
        finish()
    }
    graph.onProgress()
  })
}

export function ClientFeatureTreeshake(options: VitePluginOptions['treeshake']): Plugin[] {
  if (!options || options.client !== true)
    return []

  let streaming = false
  let graph: ClientGraph | undefined
  return [{
    name: 'unhead:client-feature-treeshake',
    apply: 'build',
    enforce: 'pre',
    configResolved(config) {
      // Nuxt emits the streaming bootstrap in a separate asset.
      streaming = config.plugins.some(plugin => plugin.api?.unheadStreaming === true || plugin.name === 'nuxt:streaming-iife-chunk')
    },
    applyToEnvironment({ name, config }) {
      return !streaming && name === 'client' && config.consumer === 'client' && !config.build.watch && !config.build.lib
    },
    async buildStart(options) {
      graph = undefined
      if (!('rolldownVersion' in this.meta) || this.meta.watchMode)
        return
      const input = typeof options.input === 'string' ? [options.input] : Object.values(options.input ?? {})
      const entries = await Promise.all(input.map(id => this.resolve(id, undefined, { isEntry: true })))
      if (!entries.length || entries.some(entry => !entry || entry.external))
        return
      graph = {
        reachable: new Set(),
        pending: new Set(),
        parsed: new Map(),
        defaults: new Set(),
      }
      visit(graph, entries.map(entry => entry!.id))
    },
    moduleParsed(module) {
      if (!graph || graph.defaults.has(module.id))
        return
      const dependencies = [...module.importedIds, ...module.dynamicallyImportedIds]
      const used = module.code === null ? undefined : collectHeadUsage(module.code, module.id)
      graph.parsed.set(module.id, { dependencies, used })
      if (graph.pending.delete(module.id))
        visit(graph, dependencies)
      if (module.isEntry)
        visit(graph, [module.id])
      graph.onProgress?.()
    },
    async load(id) {
      if (!graph || !id.endsWith('/dist/client-features.mjs') || !isAbsolute(id))
        return
      const buildGraph = graph
      const manifest = await readFile(resolve(dirname(id), '../package.json'), 'utf8')
        .then(source => JSON.parse(source) as { name?: string } | null)
        .catch((error: NodeJS.ErrnoException) => {
          // An unrelated module may have the same file name.
          if (error instanceof SyntaxError || error.code === 'ENOENT' || error.code === 'ENOTDIR')
            return undefined
          throw error
        })
      if (manifest?.name !== 'unhead')
        return
      buildGraph.defaults.add(id)
      if (buildGraph.pending.delete(id))
        buildGraph.onProgress?.()

      const selected = await (buildGraph.selection ??= waitForInventory(buildGraph))
      return `export const domEvents = ${selected._tag === 'unknown' || selected.used.domEvents}; export const titleTemplate = ${selected._tag === 'unknown' || selected.used.titleTemplate};`
    },
    async buildEnd(error) {
      if (error || !graph?.selection)
        return
      const selected = await graph.selection
      if (selected._tag === 'unknown') {
        this.info(`Unhead client features kept: ${selected.reason}`)
        return
      }

      // A plugin can emit a new entry after the initial roots have been parsed.
      for (const id of this.getModuleIds()) {
        if (this.getModuleInfo(id)?.isEntry)
          visit(graph, [id])
      }
      const final = inventory(graph)
      const removed = !selected.used.domEvents || !selected.used.titleTemplate
      if (removed && (final._tag === 'unknown'
        || (!selected.used.domEvents && final.used.domEvents)
        || (!selected.used.titleTemplate && final.used.titleTemplate))) {
        this.error('A late client entry changed the Unhead feature inventory. Disable treeshake.client for this build.')
      }
      this.info(`Unhead client features: domEvents=${selected.used.domEvents ? 'used' : 'absent'}, titleTemplate=${selected.used.titleTemplate ? 'used' : 'absent'}`)
    },
  }]
}
