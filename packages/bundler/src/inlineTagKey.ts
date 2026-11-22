import { createHash } from 'node:crypto'
import { dedupeKey, normalizeProps } from 'unhead/utils'

export type InlineTag = 'script' | 'style' | 'noscript'
const UNSAFE_BODY_RE = /[\r\0]|<\/(?:script|style|noscript)/i
const TEMPLATE_PARAM_RE = /%\w/
const SPECIAL_SCRIPT_TYPE_RE = /^(?:importmap|speculationrules)$|json$/i

export function getInlineTagKey(tag: InlineTag, input: Readonly<Record<string, unknown>>) {
  const { innerHTML, textContent, ...attrs } = input
  const body = innerHTML ?? textContent
  if (typeof body !== 'string' || !body
    || (Object.hasOwn(input, 'innerHTML') && Object.hasOwn(input, 'textContent'))
    || UNSAFE_BODY_RE.test(body) || (tag === 'script' && body.includes('<!--'))
    || (attrs.processTemplateParams !== false && TEMPLATE_PARAM_RE.test(body))
    || Object.hasOwn(attrs, 'key')) {
    return
  }

  const strategy = attrs.tagDuplicateStrategy
  if (Object.hasOwn(attrs, 'tagDuplicateStrategy') && strategy !== 'merge' && strategy !== 'replace')
    return

  for (const [field, value] of Object.entries(attrs)) {
    const name = field.toLowerCase()
    if (name === 'id' || name === 'data-hid' || name === 'data-hid-generated')
      return
    if (tag === 'script' && name === 'type' && (typeof value !== 'string' || SPECIAL_SCRIPT_TYPE_RE.test(value.trim())))
      return
  }

  const normalized = normalizeProps({ tag, props: {} }, attrs)
  if (dedupeKey(normalized) || normalized.props.src || normalized.props.hid || normalized.props.vmid)
    return

  const hash = createHash('sha256').update(`${tag}\0`).update(body, 'utf16le').digest().toString('base64url', 0, 8)
  const key = `~${hash}`
  // Generated keys are transport hints, not authored content identity.
  return { key, 'data-hid-generated': '', ...(!strategy && { tagDuplicateStrategy: 'replace' as const }) }
}
