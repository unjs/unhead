import { hasContent } from '../utils/const'
import { defineHeadPlugin } from './defineHeadPlugin'

const IMAGE_META_KEYS = /* @__PURE__ */ new Set(['og:image', 'og:image:url', 'og:image:secure_url', 'twitter:image', 'twitter:image:src'])

function hasImageContent(content: unknown): boolean {
  return !!hasContent(content) && String(content).trim() !== ''
}

function elementMetaKey(el: Element): string {
  return el.getAttribute('property') || el.getAttribute('name') || ''
}

/**
 * Image meta in the server rendered document. A server only entry adds no client tag:
 * nuxt-og-image skips og:image while hydrating, and useServerSeoMeta never runs on the client.
 */
function serverImageMeta(document: Document | undefined): Element[] {
  const images: Element[] = []
  for (const el of document?.head?.querySelectorAll('meta') || []) {
    if (IMAGE_META_KEYS.has(elementMetaKey(el)) && hasImageContent(el.getAttribute('content')))
      images.push(el)
  }
  return images
}

export interface InferSeoMetaPluginOptions {
  /**
   * Transform the og title.
   *
   * @param title
   */
  ogTitle?: ((title?: string) => string)
  /**
   * Transform the og description.
   *
   * @param description
   */
  ogDescription?: ((description?: string) => string)
  /**
   * The twitter card to use.
   *
   * By default, the card is `summary_large_image` when the resolved head has an `og:image` or `twitter:image`,
   * and `summary` otherwise. A `twitter:card` set elsewhere in the head always wins.
   * On the client, an image tag the server rendered counts until a client entry sets the same tag.
   *
   * @deprecated Twitter/X renders link previews from Open Graph metadata. Set this to `false` and rely on Open Graph metadata instead.
   */
  twitterCard?: false | 'summary' | 'summary_large_image' | 'app' | 'player'
}

export function InferSeoMetaPlugin(options: InferSeoMetaPluginOptions = {}) {
  return defineHeadPlugin((head) => {
    // read before the push below: a client push renders the document
    let serverImages = options.twitterCard === undefined && !head.ssr ? serverImageMeta(head.resolvedOptions.document) : []
    if (options.twitterCard !== false) {
      head.push({
        meta: [
          options.twitterCard
            ? { name: 'twitter:card', content: options.twitterCard, tagPriority: 'low' }
            // content is intentionally omitted - inferred from the resolved image tags by the hook below
            : { 'name': 'twitter:card', 'tagPriority': 'low', 'data-infer': '' } as any,
        ],
      })
    }
    head.push({
      meta: [
        // content is intentionally omitted - inferred from title/description by the hook below
        {
          'property': 'og:title',
          'tagPriority': 'low',
          'data-infer': '',
        } as any,
        {
          'property': 'og:description',
          'tagPriority': 'low',
          'data-infer': '',
        } as any,
      ],
    })
    return {
      key: 'infer-seo-meta',
      hooks: {
        'tags:beforeResolve': ({ tagMap }) => {
          let title = head._titleTemplate || head._title
          // check if the current title is %infer
          const ogTitle = tagMap.get('meta:og:title')
          if (typeof ogTitle?.props['data-infer'] !== 'undefined') {
            if (typeof title === 'function') {
              title = title(head._title) ?? undefined
            }
            title = hasContent(title) ? String(title) : undefined
            ogTitle.props!.content = options.ogTitle ? options.ogTitle(title) : title || ''
            ogTitle.processTemplateParams = true
          }

          const descriptionValue = tagMap.get('meta:description')?.props?.content
          const description = hasContent(descriptionValue) ? String(descriptionValue) : undefined
          const ogDescription = tagMap.get('meta:og:description')
          if (typeof ogDescription?.props['data-infer'] !== 'undefined') {
            ogDescription.props!.content = options.ogDescription ? options.ogDescription(description) : description || ''
            ogDescription.processTemplateParams = true
          }
        },
        // after resolve so an image added or dropped by any other hook still counts
        'tags:afterResolve': (ctx) => {
          let cardIndex = -1
          let hasImage = false
          for (let i = 0; i < ctx.tags.length; i++) {
            const tag = ctx.tags[i]!
            if (tag.tag !== 'meta')
              continue
            if (tag.props.name === 'twitter:card' && typeof tag.props['data-infer'] !== 'undefined') {
              cardIndex = i
              continue
            }
            const key = tag.props.property || tag.props.name
            if (!IMAGE_META_KEYS.has(key))
              continue
            hasImage ||= hasImageContent(tag.props.content)
            // a client tag adopts the server element of the same key and removes it when the entry goes
            if (serverImages.length)
              serverImages = serverImages.filter(el => elementMetaKey(el) !== key)
          }
          if (cardIndex === -1)
            return
          // the server rendered an image that no client entry manages, so the server card stands
          if (!hasImage && serverImages.length) {
            serverImages = serverImages.filter(el => el.isConnected)
            hasImage = serverImages.length > 0
          }
          const card = ctx.tags[cardIndex]!
          const props = { ...card.props, content: hasImage ? 'summary_large_image' : 'summary' }
          delete props['data-infer']
          ctx.tags[cardIndex] = { ...card, props }
        },
      },
    }
  }, 'infer-seo-meta')
}
