export const propsToString = (props: Record<string, any>) => {
  const handledAttributes = []

  for (const [key, value] of Object.entries(props)) {
    if (value === false || value == null)
      continue

    let attribute = key

    if (value !== true)
      attribute += `="${String(value).replace(/"/g, '&quot;')}"`

    handledAttributes.push(attribute)
  }

  return handledAttributes.length > 0 ? ` ${handledAttributes.join(' ')}` : ''
}
