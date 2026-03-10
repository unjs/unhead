const DOUBLE_QUOTE_RE = /"/g

/* @__PURE__ */
function encodeAttribute(value: string) {
  return String(value).replace(DOUBLE_QUOTE_RE, '&quot;')
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
        ? [...value].join(' ')
        : Array.from(value as Map<string, string>, ([k, v]) => `${k}:${v}`)
            .join(';')
    }

    if (value !== false && value !== null) {
      attrs += value === true ? ` ${key}` : ` ${key}="${encodeAttribute(value)}"`
    }
  }

  return attrs
}
