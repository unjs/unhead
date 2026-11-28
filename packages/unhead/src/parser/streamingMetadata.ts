import type { DefaultTreeAdapterTypes } from 'parse5'
import { defaultTreeAdapter, parse } from 'parse5'

type HeadSlotKind = 'title' | 'description' | 'charset'
export type HeadSlot = Readonly<{ offset: number, end: number } & (
  { kind: 'title', openTag?: string, emptyMarkup?: string }
  | { kind: 'description' | 'charset' | undefined }
)>
export interface HeadSlots {
  readonly ranges: readonly HeadSlot[]
  readonly count: number
}

export function streamingMetadataKind(node: DefaultTreeAdapterTypes.Element): HeadSlotKind | undefined {
  if (node.tagName === 'title')
    return 'title'
  if (node.tagName === 'meta') {
    if (node.attrs.some(attr => attr.name === 'http-equiv'))
      return
    if (node.attrs.some(attr => attr.name === 'charset' && attr.value))
      return 'charset'
    if (node.attrs.some(attr => attr.name === 'name' && attr.value === 'description'))
      return 'description'
  }
}

interface RenderedHeadSlot {
  kind: HeadSlotKind
  start: number
  end: number
}

// Match the renderer's common metadata prefix. Custom output and other tag
// shapes go through the HTML parser so attributes and inert markup stay safe.
const RENDERED_METADATA_RE = /<title>[^<]*<\/title>|<meta (charset)="[^"]+">|<meta name="([a-z][\w:-]*)" content="[^"]*">/y

function matchRenderedHeadSlots(headTags: string, { ranges, count }: HeadSlots): RenderedHeadSlot[] {
  const matches: RenderedHeadSlot[] = []
  let start = 0
  while (matches.length < count) {
    while (start < headTags.length && ' \t\n\f\r'.includes(headTags[start]))
      start++
    RENDERED_METADATA_RE.lastIndex = start
    const match = RENDERED_METADATA_RE.exec(headTags)
    if (!match)
      break
    const [tag, charset, name] = match
    start += tag.length
    if (name !== undefined && name !== 'description')
      continue
    const kind = charset ? 'charset' : (name ?? 'title')
    if (ranges.some(slot => slot.kind === kind) && !matches.some(match => match.kind === kind))
      matches.push({ kind, start: match.index, end: start })
  }
  if (!headTags || matches.length === count)
    return matches

  matches.length = 0
  const document = parse(headTags, { sourceCodeLocationInfo: true })
  // parse() always inserts an HTML root and places the head before the body.
  const root = document.childNodes.find(defaultTreeAdapter.isElementNode)
  const head = root?.childNodes.find(defaultTreeAdapter.isElementNode)
  for (const child of head?.childNodes ?? []) {
    if (!defaultTreeAdapter.isElementNode(child) || !child.sourceCodeLocation?.startTag)
      continue
    const kind = streamingMetadataKind(child)
    if (!kind || !ranges.some(slot => slot.kind === kind) || matches.some(slot => slot.kind === kind))
      continue
    const { startTag, endTag } = child.sourceCodeLocation
    if (kind === 'title' && !endTag)
      continue
    matches.push({ kind, start: startTag.startOffset, end: (endTag ?? startTag).endOffset })
    if (matches.length === count)
      break
  }
  return matches
}

export function renderStreamingHead(slots: HeadSlots, headTags: string, html: string, offset: number, end: number, bootstrap: string) {
  const matches = matchRenderedHeadSlots(headTags, slots)
  let result = ''
  for (const slot of slots.ranges) {
    const match = matches.find(match => match.kind === slot.kind)
    let tag = match ? headTags.slice(match.start, match.end) : undefined
    // The resolver represents a title as text. Preserve its template attributes.
    if (slot.kind === 'title') {
      if (tag?.startsWith('<title>') && slot.openTag)
        tag = slot.openTag + tag.slice('<title>'.length)
      tag ??= slot.emptyMarkup
    }
    result += html.slice(offset, slot.offset) + (tag ?? '')
    offset = slot.end
  }
  let cursor = 0
  result += html.slice(offset, end) + bootstrap
  for (const { start, end } of matches) {
    result += headTags.slice(cursor, start)
    cursor = end
  }
  return result + headTags.slice(cursor)
}
