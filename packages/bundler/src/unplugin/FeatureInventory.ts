import type { Plugin } from 'vite'
import type { FeatureEvidence } from './featureEvidence'
import { dirname } from 'node:path'
import { buildFeatures, collectFeatureEvidence, isProjectModule, unknownFeatures } from './featureEvidence'

const defaults = '#unhead-build-features'
const selector = '\0unhead:build-features'
const scanTimeout = 2000

export function FeatureInventory(): Plugin {
  let root: string
  let canInspectHtml: boolean
  let roots: string[]
  let coreDirectories: Set<string>
  let parsed: Map<string, string[]>
  let reachable: Set<string>
  let pending: Set<string>
  let graphComplete: Promise<void>
  let finishGraph: () => void
  let selected: FeatureEvidence | undefined

  function visit(ids: readonly string[]) {
    const queue = [...ids]
    while (queue.length) {
      const id = queue.pop()!
      if (reachable.has(id) || !isProjectModule(root, id))
        continue
      reachable.add(id)
      const dependencies = parsed.get(id)
      if (dependencies)
        queue.push(...dependencies)
      else
        pending.add(id)
    }
    if (!pending.size)
      finishGraph()
  }

  return {
    name: 'unhead:feature-inventory',
    apply: 'build',
    enforce: 'pre',
    applyToEnvironment(environment) {
      const { build, consumer } = environment.config
      return environment.name === 'client' && consumer === 'client' && !build.watch && !build.lib && !build.rollupOptions.preserveEntrySignatures
    },
    configResolved(config) {
      root = config.root
      // HTML hooks can insert executable tags after the module graph is linked.
      canInspectHtml = !config.plugins.some(plugin => plugin.transformIndexHtml)
    },
    async buildStart(options) {
      roots = []
      coreDirectories = new Set()
      parsed = new Map()
      reachable = new Set()
      pending = new Set()
      selected = undefined
      graphComplete = new Promise((resolve) => {
        finishGraph = resolve
      })
      if (!('rolldownVersion' in this.meta) || this.meta.watchMode)
        return
      const input = typeof options.input === 'string' ? [options.input] : Object.values(options.input ?? {})
      const resolved = await Promise.all(input.map(id => this.resolve(id, undefined, { isEntry: true })))
      if (resolved.length && resolved.every(id => id && !id.external)) {
        roots = resolved.map(id => id!.id)
        visit(roots)
      }
    },
    async resolveId(id, importer) {
      if (id !== defaults || !importer || !('rolldownVersion' in this.meta) || this.meta.watchMode)
        return
      const resolved = await this.resolve(id, importer, { skipSelf: true })
      if (!resolved || resolved.external || !resolved.id.endsWith('/dist/build-features.mjs'))
        return
      const dir = dirname(resolved.id)
      if (!importer.startsWith(`${dir}/`))
        return
      coreDirectories.add(dir)
      return selector
    },
    moduleParsed(module) {
      if (!isProjectModule(root, module.id))
        return
      const dependencies = [...module.importedIds, ...module.dynamicallyImportedIds]
      parsed.set(module.id, dependencies)
      if (pending.delete(module.id))
        visit(dependencies)
    },
    async load(id) {
      if (id !== selector)
        return

      // Pending project modules are resolved by the normal graph scan while this
      // module waits. A plugin can block that scan by awaiting this module itself.
      let timer: ReturnType<typeof setTimeout> | undefined
      const complete = roots.length && await Promise.race([
        graphComplete.then(() => true),
        new Promise<false>((resolve) => {
          timer = setTimeout(resolve, scanTimeout, false)
        }),
      ]).finally(() => clearTimeout(timer))
      const evidence = selected = complete
        ? await collectFeatureEvidence({
            root,
            canInspectHtml,
            coreDirectories,
            getModule: id => this.getModuleInfo(id),
            resolveImport: async (id, importer) => {
              const resolved = await this.resolve(id, importer)
              return resolved?.external ? undefined : resolved?.id
            },
          }, roots)
        : unknownFeatures('The client module graph could not be verified')

      return buildFeatures.map(feature => `export const ${feature} = ${evidence.features[feature] !== 'absent'};`).join('\n')
    },
    async buildEnd(error) {
      const evidence = selected
      if (error || !evidence)
        return
      const removed = buildFeatures.filter(feature => evidence.features[feature] === 'absent')
      if (removed.length) {
        const entryIds = new Set(roots)
        for (const id of this.getModuleIds()) {
          if (this.getModuleInfo(id)?.isEntry)
            entryIds.add(id)
        }
        const final = await collectFeatureEvidence({
          root,
          canInspectHtml,
          coreDirectories,
          getModule: id => this.getModuleInfo(id),
          resolveImport: async (id, importer) => {
            const resolved = await this.resolve(id, importer)
            return resolved?.external ? undefined : resolved?.id
          },
        }, [...entryIds])
        if (removed.some(feature => final.features[feature] !== 'absent'))
          this.error('A late client entry changed the Unhead feature inventory. Disable treeshake.features for this build.')
      }
      const status = buildFeatures.map(feature => `${feature}=${evidence.features[feature]}`).join(', ')
      this.info(`Unhead features: ${status}${evidence.reason ? ` (${evidence.reason})` : ''}`)
    },
  }
}
