export const PropertyPrefixKeys = /^(og|fb)/
export const ColonPrefixKeys = /^(og|twitter|fb)/

export function fixKeyCase(key: string) {
  key = key.replace(/([A-Z])/g, '-$1').toLowerCase()
  if (ColonPrefixKeys.test(key)) {
    key = key
      .replace('secure-url', 'secure_url')
      .replace(/-/g, ':')
  }
  return key
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
export function changeKeyCasingDeep<T extends any>(input: T): T {
  if (Array.isArray(input)) {
    // @ts-expect-error untyped
    return input.map(entry => changeKeyCasingDeep(entry))
  }
  if (typeof input !== 'object' || Array.isArray(input))
    return input

  const output: Record<string, any> = {}
  for (const [key, value] of Object.entries(input as object))
    output[fixKeyCase(key)] = changeKeyCasingDeep(value)

  return output as T
}
