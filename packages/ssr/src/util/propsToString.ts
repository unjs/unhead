function encodeAttribute(value: string) {
  return String(value).replace(/"/g, '&quot;')
}

export function propsToString(props: Record<string, any>) {
  let attrs = ' '

  for (const key in props) {
    if (!Object.prototype.hasOwnProperty.call(props, key)) {
      continue
    }

    const value = props[key]

    if (value !== false && value !== null) {
      attrs += value === true ? `${key} ` : `${key}="${encodeAttribute(value)}" `
    }
  }

  return attrs.trimEnd()
}
