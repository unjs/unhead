import type { DefaultTreeAdapterTypes } from 'parse5'
import { defaultTreeAdapter, parse } from 'parse5'

type HeadSlotKind = 'title' | 'description' | 'charset'
export type HeadSlot = Readonly<{ offset: number } & (
  { kind: 'title', openTag?: string, emptyMarkup?: string }
  | { kind: 'description' | 'charset' }
)>

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

function matchRenderedHeadSlots(headTags: string, slots: readonly HeadSlot[]): RenderedHeadSlot[] {
  const matches: RenderedHeadSlot[] = []
  let start = 0
  while (matches.length < slots.length) {
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
    const slot = slots.find(slot => slot.kind === kind)
    if (slot && !matches.some(match => match.kind === slot.kind))
      matches.push({ kind: slot.kind, start: match.index, end: start })
  }
  if (!headTags || matches.length === slots.length)
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
    if (!kind || !slots.some(slot => slot.kind === kind) || matches.some(slot => slot.kind === kind))
      continue
    const { startTag, endTag } = child.sourceCodeLocation
    if (kind === 'title' && !endTag)
      continue
    matches.push({ kind, start: startTag.startOffset, end: (endTag ?? startTag).endOffset })
    if (matches.length === slots.length)
      break
  }
  return matches
}

export function placeStreamingMetadata(slots: readonly HeadSlot[], headTags: string) {
  const matches = matchRenderedHeadSlots(headTags, slots)
  const inserts: { offset: number, html: string }[] = []
  for (const slot of slots) {
    const match = matches.find(match => match.kind === slot.kind)
    let html = match ? headTags.slice(match.start, match.end) : undefined
    // The resolver represents a title as text. Preserve its template attributes.
    if (slot.kind === 'title') {
      if (html?.startsWith('<title>') && slot.openTag)
        html = slot.openTag + html.slice('<title>'.length)
      html ??= slot.emptyMarkup
    }
    if (html)
      inserts.push({ offset: slot.offset, html })
  }
  let cursor = 0
  let remaining = ''
  for (const { start, end } of matches) {
    remaining += headTags.slice(cursor, start)
    cursor = end
  }
  return { inserts, headTags: remaining + headTags.slice(cursor) }
}
