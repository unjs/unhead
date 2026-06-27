const DOUBLE_QUOTE_RE = /"/g

/* @__PURE__ */
function encodeAttribute(value: string) {
  const s = typeof value === 'string' ? value : String(value)
  return s.includes('"') ? s.replace(DOUBLE_QUOTE_RE, '&quot;') : s
}

function classToString(value: Iterable<string>) {
  let out = ''
  for (const c of value) out += out ? ` ${c}` : c
  return out
}

function styleToString(value: Iterable<[string, string]>) {
  let out = ''
  for (const [k, v] of value) out += out ? `;${k}:${v}` : `${k}:${v}`
  return out
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
        ? classToString(value)
        : styleToString(value)
    }

    if (value !== false && value !== null) {
      attrs += value === true ? ` ${key}` : ` ${key}="${encodeAttribute(value)}"`
    }
  }

  return attrs
}
