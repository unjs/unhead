function encodeAttribute(value: string) {
  return String(value).replace(/"/g, '&quot;')
}

export function propsToString(props: Record<string, any>) {
  const attrs: string[] = []

  for (const [key, value] of Object.entries(props)) {
    if (value !== false && value !== null)
      attrs.push(value === true ? key : `${key}="${encodeAttribute(value)}"`)
  }

  return `${attrs.length > 0 ? ' ' : ''}${attrs.join(' ')}`
}
