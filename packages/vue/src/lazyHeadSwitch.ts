import type { Plugin } from 'vite'

const entries: Record<string, string> = {
  '@unhead/vue/client': 'createHead',
  '@unhead/vue/stream/client': 'createStreamableHead',
}

const prefix = '\0unhead:lazy-vue:'

export function lazyHeadSwitch(): Plugin {
  let aliasedEntries: [string, string][] = []
  return {
    name: 'unhead:lazy-vue-client',
    apply: 'build',
    enforce: 'pre',
    applyToEnvironment: environment => environment.config.consumer === 'client',
    configResolved(config) {
      aliasedEntries = Object.entries(entries).filter(([id]) => config.resolve.alias.some(({ find }) =>
        typeof find === 'string' ? id === find || id.startsWith(`${find}/`) : new RegExp(find).test(id),
      ))
    },
    async resolveId(id, importer, options) {
      // The virtual wrapper must keep its eager re-exports unchanged.
      if (importer?.startsWith(prefix) || options.custom?.unheadLazySwitch)
        return
      const resolveOptions = { skipSelf: true, custom: { unheadLazySwitch: true } }
      let name = Object.hasOwn(entries, id) ? entries[id] : undefined
      let eager
      if (!name) {
        // Vite's alias plugin runs first and re-enters resolution with the
        // replacement. Compare resolved entries rather than the raw specifier.
        for (const [entry, factory] of aliasedEntries) {
          const resolved = await this.resolve(entry, importer, resolveOptions)
          if (resolved?.id === id) {
            name = factory
            eager = resolved
            break
          }
        }
      }
      if (!name)
        return
      const [resolvedEager, lazy] = await Promise.all([
        eager ?? this.resolve(id, importer, resolveOptions),
        this.resolve('@unhead/vue/lazy', importer, resolveOptions),
      ])
      if (resolvedEager && lazy)
        return { id: prefix + name, meta: { unhead: { eager: resolvedEager.id, lazy: lazy.id } } }
    },
    load(id) {
      if (!id.startsWith(prefix))
        return
      const name = id.slice(prefix.length)
      const { eager, lazy } = this.getModuleInfo(id)!.meta.unhead as { eager: string, lazy: string }
      return `export * from ${JSON.stringify(eager)}; export { ${name}AfterHydration as ${name} } from ${JSON.stringify(lazy)};`
    },
  }
}
