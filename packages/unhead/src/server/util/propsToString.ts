import { INVALID_ATTR_NAME_RE } from '../../utils/attrs'

const HAS_ATTR_ESCAPE_RE = /[&<>"]/
// & is only escaped when it does not already start a character reference, so
// pre-escaped values (e.g. `&amp;`) pass through unchanged. Numeric and hex
// references decode in browsers with or without a trailing `;`. Legacy named
// references (the HTML4 set) decode only when not followed by `=` or an ASCII
// alphanumeric, keeping `&amp=` and `&copy=1` literal.
const ESCAPE_ATTR_RE = /&(?!#\d|#x[\da-f]|[a-z][a-z0-9]*;|(?:aacute|acirc|acute|aelig|agrave|amp|aring|atilde|auml|brvbar|ccedil|cedil|cent|copy|curren|deg|divide|eacute|ecirc|egrave|eth|euml|frac12|frac14|frac34|gt|iacute|icirc|iexcl|igrave|iquest|iuml|laquo|lt|macr|micro|middot|nbsp|not|ntilde|oacute|ocirc|ograve|ordf|ordm|oslash|otilde|ouml|para|plusmn|pound|quot|raquo|reg|sect|shy|sup1|sup2|sup3|szlig|thorn|times|uacute|ucirc|ugrave|uml|uuml|yacute|yen|yuml)(?![=0-9a-z]))|[<>"]/gi
const ESCAPE_ATTR_MAP: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }

/* @__PURE__ */
function encodeAttribute(value: string) {
  const s = typeof value === 'string' ? value : String(value)
  return HAS_ATTR_ESCAPE_RE.test(s) ? s.replace(ESCAPE_ATTR_RE, c => ESCAPE_ATTR_MAP[c]) : s
}

/* @__PURE__ */
export function propsToString(props: Record<string, any>) {
  let attrs = ''

  for (const key in props) {
    if (!Object.hasOwn(props, key) || !key || INVALID_ATTR_NAME_RE.test(key))
      continue

    let value = props[key]

    // class (set) and style (map)
    if (typeof value !== 'string') {
      if (key === 'class') {
        let out = ''
        for (const c of value) out += out ? ` ${c}` : c
        value = out
      }
      else if (key === 'style') {
        let out = ''
        for (const [k, v] of value) out += out ? `;${k}:${v}` : `${k}:${v}`
        value = out
      }
    }

    if (value !== false && value !== null) {
      attrs += value === true ? ` ${key}` : ` ${key}="${encodeAttribute(value)}"`
    }
  }

  return attrs
}
