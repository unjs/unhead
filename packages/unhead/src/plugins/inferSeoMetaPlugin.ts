import type { HeadTag } from '../types'
import { hasContent } from '../utils/const'
import { defineHeadPlugin, withTagTransform } from './defineHeadPlugin'

const IMAGE_META_KEYS = /* @__PURE__ */ new Set(['og:image', 'og:image:url', 'og:image:secure_url', 'twitter:image', 'twitter:image:src'])

function isImageMeta(tag: HeadTag): boolean {
  if (tag.tag !== 'meta')
    return false
  const content = tag.props.content
  return IMAGE_META_KEYS.has(tag.props.property || tag.props.name) && !!hasContent(content) && String(content).trim() !== ''
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
   *
   * @deprecated Twitter/X renders link previews from Open Graph metadata. Set this to `false` and rely on Open Graph metadata instead.
   */
  twitterCard?: false | 'summary' | 'summary_large_image' | 'app' | 'player'
}

// The `compileTags` output of the input below, for the compiled server head, which runs
// the transform of this plugin itself. Every head pushes the same
// arrays, so the server memo, keyed on the identity of compiled tags, serves them.
const inferredMetaCache: Record<string, any> = {}
function inferredMeta(names: string[], content?: string): any {
  return inferredMetaCache[`${names}:${content}`] ||= names.map(name => ['meta', { [name.startsWith('og') ? 'property' : 'name']: name, ...content ? { content } : { 'data-infer': '' } }, 102, `meta:${name}`, { tagPriority: 'low' }, 1])
}

// The content an inferred tag takes, or nothing to keep the tag as it is
function inferContent(tag: HeadTag, title: unknown, description: unknown, hasImage: boolean, options: InferSeoMetaPluginOptions): string | undefined {
  const key = tag.props.property || tag.props.name
  if (key === 'og:title')
    return options.ogTitle ? options.ogTitle(title as string | undefined) : (title as string) || ''
  if (key === 'og:description')
    return options.ogDescription ? options.ogDescription(description as string | undefined) : (description as string) || ''
  if (key === 'twitter:card')
    return hasImage ? 'summary_large_image' : 'summary'
}

export function InferSeoMetaPlugin(options: InferSeoMetaPluginOptions = {}) {
  return defineHeadPlugin((head) => {
    const compiled = (head as { _acceptsCompiled?: unknown })._acceptsCompiled
    if (options.twitterCard !== false) {
      const card = options.twitterCard
        ? { name: 'twitter:card', content: options.twitterCard, tagPriority: 'low' }
        // no content: the transform infers it from the resolved image tags
        : { 'name': 'twitter:card', 'tagPriority': 'low', 'data-infer': '' }
      head.push(compiled ? inferredMeta(['twitter:card'], options.twitterCard) : { meta: [card] } as any)
    }
    // no content: the transform infers it from the title and description
    const inferred = [
      { 'property': 'og:title', 'tagPriority': 'low', 'data-infer': '' },
      { 'property': 'og:description', 'tagPriority': 'low', 'data-infer': '' },
    ]
    head.push(compiled ? inferredMeta(['og:title', 'og:description']) : { meta: inferred } as any)
    return withTagTransform(head, {
      key: 'infer-seo-meta',
      // a custom transform may test the text, which the server memo holds as a token
      ...(options.ogTitle || options.ogDescription) && { cacheKey: () => null },
      // after every other step, so a title template, template params, and an image added or dropped all count
      transform(tags) {
        let title: unknown
        let description: unknown
        let hasImage = false
        for (const tag of tags) {
          if (tag.tag === 'title')
            title = tag.textContent
          else if (tag.tag === 'meta' && tag.props.name === 'description')
            description = tag.props.content
          else
            hasImage ||= isImageMeta(tag)
        }
        title = hasContent(title) ? String(title) : undefined
        description = hasContent(description) ? String(description) : undefined
        return tags.map((tag) => {
          const content = tag.tag === 'meta' && typeof tag.props['data-infer'] !== 'undefined' && inferContent(tag, title, description, hasImage, options)
          if (content === undefined || content === false)
            return tag
          const props: Record<string, any> = { ...tag.props, content }
          // the twitter card renders without the marker, and the og tags keep it, as before transforms
          if (tag.props.name === 'twitter:card')
            delete props['data-infer']
          return { ...tag, props }
        })
      },
    })
  }, 'infer-seo-meta')
}
