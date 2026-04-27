/**
 * Convert eligible `useHead({ title?, description?, meta: [...] })` calls into
 * `useSeoMeta({ title?, description?, …flatMeta })`. The flat shape gives full
 * TypeScript autocompletion for every known SEO/OG/Twitter tag, so this is a
 * pure ergonomic upgrade when the call is meta-only.
 *
 * The check is intentionally conservative: it bails on any shape it can't
 * losslessly translate (link/script/style/htmlAttrs blocks, computed keys,
 * spreads, `id` / `key` / `tagPriority` attrs, duplicate flat-keys). Better
 * to skip a borderline case than rewrite it incorrectly.
 */

type Node = any

const TS_WRAPPERS = new Set([
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSNonNullExpression',
  'TSTypeAssertion',
  'TSInstantiationExpression',
])

function unwrapTS(node: Node | undefined): Node | undefined {
  let cur = node
  while (cur && TS_WRAPPERS.has(cur.type))
    cur = cur.expression
  return cur
}

function getKeyName(prop: Node): string | undefined {
  if (prop.type !== 'Property' || prop.computed)
    return undefined
  const k = prop.key
  if (k.type === 'Identifier')
    return k.name
  if (k.type === 'Literal' && typeof k.value === 'string')
    return k.value
  return undefined
}

/**
 * Convert a `name="theme-color"` / `property="og:image:secure_url"` /
 * `http-equiv="X-UA-Compatible"` style meta attribute value into the flat
 * useSeoMeta key (`themeColor`, `ogImageSecureUrl`, `xUaCompatible`). Splits on
 * `:`, `-`, and `_`, lowercases the first segment, capitalises the rest.
 */
function metaTagToFlatKey(value: string): string | undefined {
  const parts = value.split(/[:\-_]/).filter(Boolean)
  if (parts.length === 0)
    return undefined
  const head = parts[0].toLowerCase()
  const tail = parts.slice(1).map(p => p[0].toUpperCase() + p.slice(1).toLowerCase()).join('')
  return head + tail
}

export interface UseSeoMetaConversion {
  /** New props in source order, with original source text preserved for each value. */
  props: { key: string, valueSource: string }[]
}

const PASSTHROUGH_KEYS = new Set(['title', 'titleTemplate'])
const META_ATTR_KEYS = new Set(['name', 'property', 'http-equiv', 'httpEquiv'])

export function analyzeUseHeadForUseSeoMeta(inputNode: Node, pieceCode: string): UseSeoMetaConversion | undefined {
  if (inputNode.type !== 'ObjectExpression')
    return undefined

  const props: { key: string, valueSource: string }[] = []
  const seenFlatKeys = new Set<string>()
  let metaCount = 0

  for (const prop of inputNode.properties) {
    if (prop.type !== 'Property' || prop.computed || prop.shorthand)
      return undefined
    const key = getKeyName(prop)
    if (!key)
      return undefined

    if (PASSTHROUGH_KEYS.has(key)) {
      const valueSource = pieceCode.slice(prop.value.start, prop.value.end)
      if (seenFlatKeys.has(key))
        return undefined
      seenFlatKeys.add(key)
      props.push({ key, valueSource })
      continue
    }

    if (key !== 'meta')
      return undefined

    const metaArr = unwrapTS(prop.value)
    if (metaArr?.type !== 'ArrayExpression')
      return undefined

    for (const el of metaArr.elements) {
      const obj = unwrapTS(el)
      if (obj?.type !== 'ObjectExpression')
        return undefined

      let flatKey: string | undefined
      let contentSource: string | undefined
      let charsetSource: string | undefined

      for (const mp of obj.properties) {
        if (mp.type !== 'Property' || mp.computed || mp.shorthand)
          return undefined
        const k = getKeyName(mp)
        if (!k)
          return undefined

        if (k === 'charset') {
          flatKey = 'charset'
          charsetSource = pieceCode.slice(mp.value.start, mp.value.end)
          continue
        }
        if (META_ATTR_KEYS.has(k)) {
          const v = unwrapTS(mp.value)
          if (v?.type !== 'Literal' || typeof v.value !== 'string')
            return undefined
          const candidate = metaTagToFlatKey(v.value)
          if (!candidate)
            return undefined
          // Multiple identifiers (name + property) on the same entry → invalid input,
          // bail rather than silently choosing one.
          if (flatKey && flatKey !== candidate)
            return undefined
          flatKey = candidate
          continue
        }
        if (k === 'content') {
          contentSource = pieceCode.slice(mp.value.start, mp.value.end)
          continue
        }
        // media, hid, key, id, tagPriority, lang, dir, … — anything beyond
        // attr+content can't be expressed in the flat shape.
        return undefined
      }

      if (!flatKey)
        return undefined
      const valueSource = charsetSource ?? contentSource
      if (!valueSource)
        return undefined
      if (seenFlatKeys.has(flatKey))
        return undefined
      seenFlatKeys.add(flatKey)
      props.push({ key: flatKey, valueSource })
      metaCount++
    }
  }

  // Skip useHead({ title: '…' }) — already minimal, useSeoMeta wouldn't add value.
  if (metaCount === 0)
    return undefined

  return { props }
}

/**
 * Render the converted props as the new `useSeoMeta` argument source. Preserves
 * the original indentation hint by detecting the indent prefix of the first
 * non-empty line inside the original object expression.
 */
export function renderUseSeoMetaArg(conversion: UseSeoMetaConversion, originalSource: string): string {
  const indent = detectIndent(originalSource)
  const lines = conversion.props.map(p => `${indent}${p.key}: ${p.valueSource},`)
  return `{\n${lines.join('\n')}\n}`
}

function detectIndent(source: string): string {
  const m = source.match(/\n([ \t]+)\S/)
  return m ? m[1] : '  '
}
