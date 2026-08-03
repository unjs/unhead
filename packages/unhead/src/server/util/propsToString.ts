/* @__PURE__ */
import { INVALID_ATTR_NAME_RE } from '../../utils/attrs'
import { hasOwn } from '../../utils/hasOwn'

function encodeAttribute(value: string) {
  return String(value).replace(/"/g, '&quot;')
}

/* @__PURE__ */
export function propsToString(props: Record<string, any>) {
  let attrs = ''

  for (const key in props) {
    if (!hasOwn(props, key) || !key || INVALID_ATTR_NAME_RE.test(key))
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
