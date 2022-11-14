import { createHead } from '@unhead/vue'
import { renderSSRHead } from '@unhead/ssr'
import { defineNuxtPlugin } from '#app'
import { useHead } from '@unhead/vue'

// Note: This is just a copy of Nuxt's internal head plugin with modifications made for this issue

export default defineNuxtPlugin((nuxtApp) => {
  const head = createHead()

  nuxtApp.vueApp.use(head)

  nuxtApp._useHead = useHead

  console.log('created head instance')

  if (process.client) {
    console.log('adding dom hooks')
    // pause dom updates until page is ready and between page transitions
    let pauseDOMUpdates = true
    head.hooks.hook('dom:beforeRender', (context) => {
      context.shouldRender = !pauseDOMUpdates
    })
    nuxtApp.hooks.hook('page:start', () => {
      console.log('page:Start')
      pauseDOMUpdates = true
      // triggers dom update
    })
    // watch for new route before unpausing dom updates (triggered after suspense resolved)
    nuxtApp.hooks.hook('page:finish', () => {
      console.log('page finish')
      pauseDOMUpdates = false
      head.hooks.callHook('entries:updated', head)
    })
  }

  if (process.server) {
    nuxtApp.ssrContext!.renderMeta = async () => {
      const meta = await renderSSRHead(head)
      return {
        ...meta,
        // resolves naming difference with NuxtMeta and @unhead/vue
        bodyScripts: meta.bodyTags,
      }
    }
  }
})
