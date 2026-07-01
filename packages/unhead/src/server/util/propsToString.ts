import { INVALID_ATTR_NAME_RE } from '../../utils/attrs'

const DOUBLE_QUOTE_RE = /"/g

/* @__PURE__ */
function encodeAttribute(value: string) {
  const s = typeof value === 'string' ? value : String(value)
  return s.includes('"') ? s.replace(DOUBLE_QUOTE_RE, '&quot;') : s
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
