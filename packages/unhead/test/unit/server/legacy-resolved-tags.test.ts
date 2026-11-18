import type { HeadTagInput } from 'unhead/types'
import { createHead, renderSSRHead, ssrRenderTags } from 'unhead/server'
import { describe, expect, it } from 'vitest'

describe('ssr resolved attribute inputs', () => {
  const renderers = {
    ssrRenderTags,
    renderSSRHead: (tags: HeadTagInput[]) => renderSSRHead(createHead({ disableDefaults: true }), { resolvedTags: tags }),
  }

  it.each(Object.entries(renderers))('%s retains props-only root attributes without render hooks', (_, render) => {
    const tags: HeadTagInput[] = [
      Object.freeze({ tag: 'htmlAttrs', props: Object.freeze({ lang: 'en' }) }),
      Object.freeze({ tag: 'bodyAttrs', props: Object.freeze({ id: 'app' }) }),
      Object.freeze({ tag: 'meta', props: Object.freeze({ name: 'description', content: 'legacy' }) }),
    ]

    expect(render(tags)).toMatchObject({
      htmlAttrs: ' lang="en"',
      bodyAttrs: ' id="app"',
      headTags: '<meta name="description" content="legacy">',
    })
  })

  it.each(Object.entries(renderers))('%s prefers canonical attrs, including empty attributes', (_, render) => {
    const tags: HeadTagInput[] = [
      { tag: 'htmlAttrs', attrs: { lang: 'fr' }, props: { lang: 'en' } },
      { tag: 'bodyAttrs', attrs: {}, props: { id: 'legacy' } },
      { tag: 'meta', attrs: { name: 'description', content: 'canonical' }, props: { content: 'legacy' } },
    ]

    expect(render(tags)).toMatchObject({
      htmlAttrs: ' lang="fr"',
      bodyAttrs: '',
      headTags: '<meta name="description" content="canonical">',
    })
  })
})
