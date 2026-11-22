import type { HtmlTagDescriptor, Plugin, ResolvedConfig } from 'vite'
import { posix } from 'node:path'

export function LazyHeadPreload(framework?: string): Plugin {
  let config: ResolvedConfig
  let lazyEntry: string | undefined
  const runtimeIds = new Set<string>()

  return {
    name: 'unhead:lazy-head-preload',
    apply: 'build',
    applyToEnvironment: environment => environment.config.consumer === 'client',
    configResolved(resolved) {
      config = resolved
    },
    async buildStart() {
      if (!config.isProduction)
        return
      // Resolve from the framework package so strict installs can find its unhead dependency.
      const frameworkEntry = framework && await this.resolve(`${framework}/lazy`)
      lazyEntry = (await this.resolve('unhead/lazy', frameworkEntry ? frameworkEntry.id : undefined))?.id
    },
    generateBundle: {
      order: 'pre',
      handler() {
        runtimeIds.clear()
        if (!lazyEntry)
          return
        // The published entry re-exports the shell from a shared module.
        const shellIds = new Set([lazyEntry])
        for (const id of shellIds) {
          const info = this.getModuleInfo(id)
          for (const imported of info?.importedIds ?? [])
            shellIds.add(imported)
          for (const imported of info?.dynamicallyImportedIds ?? [])
            runtimeIds.add(imported)
        }
      },
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, { bundle, chunk, path }) {
        if (!bundle || !chunk || !runtimeIds.size)
          return

        const eager = new Set([chunk.fileName])
        const deferred = new Set<string>()
        for (const file of eager) {
          const imported = bundle[file]
          if (imported?.type !== 'chunk')
            continue
          for (const dependency of imported.imports)
            eager.add(dependency)
          for (const dependency of imported.dynamicImports)
            deferred.add(dependency)
        }

        const hostId = path.slice(1)
        const tags: HtmlTagDescriptor[] = []
        for (const file of deferred) {
          const imported = bundle[file]
          if (eager.has(file) || imported?.type !== 'chunk' || !imported.facadeModuleId || !runtimeIds.has(imported.facadeModuleId))
            continue

          const builtUrl = config.experimental.renderBuiltUrl?.(file, { hostId, hostType: 'html', type: 'asset', ssr: false })
          if (typeof builtUrl === 'object' && builtUrl.runtime)
            continue
          const relative = (typeof builtUrl === 'object' ? builtUrl.relative : undefined) ?? (config.base === './' || config.base === '')
          const href = typeof builtUrl === 'string'
            ? builtUrl
            : relative ? posix.relative(posix.dirname(hostId), file) : `${decodeURI(config.base)}${file}`
          tags.push({
            tag: 'link',
            attrs: { rel: 'modulepreload', href: href.replace(/^[^?#]+/, encodeURI), crossorigin: true, fetchpriority: 'low' },
            injectTo: 'head',
          })
        }
        return tags
      },
    },
  }
}
