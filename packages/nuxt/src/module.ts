import { fileURLToPath } from 'url'
import { addComponent, addImports, addPlugin, addTemplate, defineNuxtModule } from '@nuxt/kit'

export interface ModuleOptions {
  resolveAliases: boolean
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-unhead',
    configKey: 'head',
    compatibility: {
      nuxt: '>=3.0.0-rc.13',
    },
  },
  defaults: {
    resolveAliases: false,
  },
  async setup(options, nuxt) {
    const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url))

    addTemplate({
      filename: 'nuxt-hedge-config.mjs',
      getContents: () => `export default ${JSON.stringify(options)}`,
    })

    await addComponent({
      name: 'DebugHead',
      mode: 'client',
      filePath: `${runtimeDir}/components/DebugHead.client.vue`,
    })

    addPlugin({ src: runtimeDir + '/plugin' })

    ;[
      'useHead',
      'useServerHead',
      'useTitle',
      'useTitleTemplate',
      'useBase',
      'useScript',
      'useStyle',
      'useLink',
      'useMeta',
      'useNoscript',
      'useBodyAttrs',
      'useHtmlAttrs',
    ].forEach((name) => {
      addImports({
        name,
        from: `${runtimeDir}/composables`,
      })
    })
  },
})
