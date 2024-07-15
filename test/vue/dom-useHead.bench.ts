import { bench, describe } from 'vitest'
import {createHead, setHeadInjectionHandler, useHead} from '@unhead/vue'
import { ref } from 'vue'
import { renderDOMHead } from '@unhead/dom'
import { useDom } from '../fixtures'

describe('dom-useHead', () => {
  bench('x50', async () => {
    const head = createHead()
    setHeadInjectionHandler(() => head)
    const page = ref({
      title: 'Home',
      description: 'Home page description',
      image: 'https://nuxtjs.org/meta_0.png',
    })
    useHead({
      // de-dupe keys
      title: 'bench test',
    })
    for (const i in Array.from({ length: 1000 })) {
      useHead({
        // de-dupe keys
        title: () => `${page.value.title}-${i} | Nuxt`,
        meta: [
          {
            name: 'description',
            content: () => `${page.value.description} ${i}`,
          },
          {
            property: 'og:image',
            content: () => `${page.value.image}?${i}`,
          },
        ],
        script: [
          {
            src: () => `https://example.com/script.js?${i}`,
          },
        ],
        link: [
          {
            as: 'style',
            href: () => `https://example.com/style.js?${i}`,
          },
        ],
      })
    }
    const dom = useDom()
    await renderDOMHead(head, { document: dom.window.document })

    page.value.image = page.value.image.replace('_0', '_1')
    page.value.title = 'Updated'

    await renderDOMHead(head, { document: dom.window.document })
  }, {
    iterations: 100,
  })
})
