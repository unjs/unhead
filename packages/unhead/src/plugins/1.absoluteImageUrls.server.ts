import { createSitePathResolver } from '#imports'
import { injectHead } from '@unhead/vue'
import { defineNuxtPlugin } from 'nuxt/app'
import { unref } from 'vue'

export default defineNuxtPlugin({
  enforce: 'post',
  setup() {
    const head = injectHead()
    // something quite wrong
    if (!head)
      return

    const resolver = createSitePathResolver({
      withBase: true,
      absolute: true,
      canonical: true,
    })
    head.use({
      hooks: {
        'tags:resolve': async ({ tags }) => {
          // iterate through tags that require absolute URLs and add the host base
          for (const tag of tags) {
            // og:image and twitter:image need to be absolute
            if (tag.tag !== 'meta')
              continue
            if (tag.props.property !== 'og:image:url' && tag.props.property !== 'og:image' && tag.props.name !== 'twitter:image')
              continue
            if (typeof tag.props.content !== 'string' || !tag.props.content.trim() || tag.props.content.startsWith('http') || tag.props.content.startsWith('//'))
              continue
            tag.props.content = unref(resolver(tag.props.content))
          }
        },
      },
    })
  },
})
