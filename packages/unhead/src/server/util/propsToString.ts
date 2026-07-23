const AMPERSAND_RE = /&/g
const DOUBLE_QUOTE_RE = /"/g

/* @__PURE__ */
function encodeAttribute(value: string) {
  const s = typeof value === 'string' ? value : String(value)
  return s.includes('&') || s.includes('"')
    ? s.replace(AMPERSAND_RE, '&amp;').replace(DOUBLE_QUOTE_RE, '&quot;')
    : s
}

/* @__PURE__ */
export function propsToString(props: Record<string, any>) {
  let attrs = ''

  for (const key in props) {
    if (!Object.hasOwn(props, key))
      continue

    let value = props[key]

    // class (set) and style (map)
    if ((key === 'class' || key === 'style') && typeof value !== 'string') {
      value = key === 'class'
        ? Array.from(value).join(' ')
        : Array.from(value as Map<string, string>)
            .map(([k, v]) => `${k}:${v}`)
            .join(';')
    }

    if (value !== false && value !== null) {
      attrs += value === true ? ` ${key}` : ` ${key}="${encodeAttribute(value)}"`
    }
  }

  return attrs
}
