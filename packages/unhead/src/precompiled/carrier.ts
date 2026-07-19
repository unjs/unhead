import type { HeadTag, PropResolver } from 'unhead/types'

export type EncodedHeadTag = Omit<HeadTag, 'props'> & { props: Record<string, any> }

function cloneTag(tag: EncodedHeadTag): HeadTag {
  const { _d, _p, _w, ...source } = tag
  if (!source.key)
    delete source._h
  const props = { ...source.props }
  if (tag.tag !== 'templateParams') {
    if (props.class != null)
      props.class = new Set(props.class instanceof Set ? props.class : Array.isArray(props.class) ? props.class : [])
    if (props.style != null)
      props.style = new Map((props.style instanceof Map ? props.style : Array.isArray(props.style) ? props.style.filter(Array.isArray) : []) as Iterable<[any, any]>)
  }
  return { ...source, props } as HeadTag
}

export class PrecompiledHeadInputBase {
  _t: EncodedHeadTag[]

  constructor(source: EncodedHeadTag[]) {
    this._t = source
  }

  _r(_materialize: boolean, propResolvers: PropResolver[]): HeadTag[] {
    const resolver = propResolvers.find(resolver => !resolver._static)
    if (resolver)
      throw new Error(`[unhead:pc] Non-static prop resolver: ${resolver.name || 'anonymous'}`)
    return this._t.map(cloneTag)
  }
}
