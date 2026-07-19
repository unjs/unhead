import type { ResolvableHead } from 'unhead/types'
import type { EncodedHeadTag } from './precompiled/carrier'
import { PrecompiledHeadInputBase } from './precompiled/carrier'
import { TagConfigKeys } from './utils/const'

function toResolvableHead(tags: EncodedHeadTag[]): ResolvableHead {
  const input: Record<string, any> = {}
  for (const tag of tags) {
    const props: Record<string, any> = { ...tag.props }
    if (tag.tag !== 'templateParams') {
      if (props.class instanceof Set)
        props.class = [...props.class]
      if (props.style instanceof Map || Array.isArray(props.style))
        props.style = Object.fromEntries(props.style)
    }
    for (const key of TagConfigKeys as Set<keyof EncodedHeadTag>) {
      if (tag[key] !== undefined)
        props[key] = tag[key]
    }
    if (tag.tag === 'title' || tag.tag === 'titleTemplate')
      input[tag.tag] = Object.keys(props).some(key => key !== 'textContent') ? props : tag.textContent
    else if (tag.tag === 'htmlAttrs' || tag.tag === 'bodyAttrs' || tag.tag === 'templateParams')
      input[tag.tag] = props
    else
      (input[tag.tag] ||= []).push(props)
  }
  return input as ResolvableHead
}

class PrecompiledHeadInput extends PrecompiledHeadInputBase {
  toJSON(): ResolvableHead {
    return toResolvableHead(this._t)
  }
}

/**
 * Wrap build-normalized tags for the experimental precompile runtime.
 *
 * The reviver is deliberately provided by this opt-in subpath so the normal
 * `unhead` entry only pays for a tiny callable check. `toJSON` falls back to a
 * regular head input when an entry crosses an SSR streaming boundary.
 *
 * @experimental
 */
export function precompiledHeadInput(source: EncodedHeadTag[]): ResolvableHead {
  return new PrecompiledHeadInput(source) as unknown as ResolvableHead
}
