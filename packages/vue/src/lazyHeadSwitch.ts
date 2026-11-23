import type { Plugin } from 'vite'

const entries: Record<string, string> = {
  '@unhead/vue/client': 'createHead',
  '@unhead/vue/stream/client': 'createStreamableHead',
}

const prefix = '\0unhead:lazy-vue:'

export function lazyHeadSwitch(): Plugin {
  return {
    name: 'unhead:lazy-vue-client',
    apply: 'build',
    enforce: 'pre',
    applyToEnvironment: environment => environment.config.consumer === 'client',
    async resolveId(id, importer) {
      const name = Object.hasOwn(entries, id) && entries[id]
      if (!name)
        return
      const [eager, lazy] = await Promise.all([
        this.resolve(id, importer, { skipSelf: true }),
        this.resolve('@unhead/vue/lazy', importer),
      ])
      if (eager && lazy)
        return { id: prefix + name, meta: { unhead: { eager: eager.id, lazy: lazy.id } } }
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
