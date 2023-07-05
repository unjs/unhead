import type { Head, MetaFlatInput } from '@unhead/schema'
import { unpackToArray, unpackToString } from 'packrup'
import { MetaPackingSchema } from './utils'

const OpenGraphInputs = ['og:Image', 'og:Video', 'og:Audio', 'twitter:Image']

const SimpleArrayUnpackMetas: (keyof MetaFlatInput)[] = ['themeColor']

const ColonPrefixKeys = /^(og|twitter|fb)/

const PropertyPrefixKeys = /^(og|fb)/

export function resolveMetaKeyType(key: string): string {
  return PropertyPrefixKeys.test(key) ? 'property' : (MetaPackingSchema[key]?.metaKey || 'name')
}

export function resolveMetaKeyValue(key: string): string {
  return MetaPackingSchema[key]?.keyValue || fixKeyCase(key)
}

function fixKeyCase(key: string) {
  key = key.replace(/([A-Z])/g, '-$1').toLowerCase()
  if (ColonPrefixKeys.test(key)) {
    key = key
      .replace('secure-url', 'secure_url')
      .replace(/-/g, ':')
  }
  return key
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
function changeKeyCasingDeep<T extends any>(input: T): T {
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

/**
 * Converts a flat meta object into an array of meta entries.
 * @param input
 */
export function unpackMeta<T extends MetaFlatInput>(input: T): Required<Head>['meta'] {
  const extras: Record<string, any>[] = []

  OpenGraphInputs.forEach((key) => {
    const propKey = key.toLowerCase()
    const inputKey = `${key.replace(':' , '')}` as keyof MetaFlatInput
    const val = input[inputKey]
    if (typeof val === 'object') {
      (Array.isArray(val) ? val : [val])
        .forEach((entry) => {
          if (!entry)
            return
          const unpackedEntry = unpackToArray(entry as Record<string, any>, {
            key: key.startsWith('og') ? 'property' : 'name',
            value: 'content',
            resolveKeyData({ key }) {
              return fixKeyCase(`${propKey}${key !== 'url' ? `:${key}` : ''}`)
            },
            resolveValueData({ value }) {
              return typeof value === 'number' ? value.toString() : value
            },
          })
          extras.push(
            // need to sort the entry and make sure the `og:image` is first
            ...unpackedEntry.sort((a, b) => (a.property === propKey ? -1 : b.property === propKey ? 1 : 0)),
          )
        })
      delete input[inputKey]
    }
  })

  SimpleArrayUnpackMetas.forEach((meta: keyof T) => {
    if (input[meta] && typeof input[meta] !== 'string') {
      // maybe it's an array, convert to array
      const val = (Array.isArray(input[meta]) ? input[meta] : [input[meta]]) as (Record<string, string>)[]
      // for each array entry
      delete input[meta]
      val.forEach((entry) => {
        extras.push({
          name: fixKeyCase(meta as string),
          ...entry,
        })
      })
    }
  })

  const meta = unpackToArray((input), {
    key({ key }) {
      return resolveMetaKeyType(key) as string
    },
    value({ key }) {
      return key === 'charset' ? 'charset' : 'content'
    },
    resolveKeyData({ key }) {
      return resolveMetaKeyValue(key)
    },
    resolveValueData({ value, key }) {
      if (value === null)
        return '_null'

      if (typeof value === 'object')
        return resolvePackedMetaObjectValue(value, key)

      return typeof value === 'number' ? value.toString() : value
    },
  })
  // remove keys with defined but empty content
  return [...extras, ...meta].filter(v => typeof v.content === 'undefined' || v.content !== '_null')
}

export function resolvePackedMetaObjectValue(value: string, key: string): string {
  const definition = MetaPackingSchema[key]

  // refresh is weird...
  if (key === 'refresh')
    // @ts-expect-error untyped
    return `${value.seconds};url=${value.url}`

  return unpackToString(
    changeKeyCasingDeep(value), {
      entrySeparator: ', ',
      keyValueSeparator: '=',
      resolve({ value, key }) {
        if (value === null)
          return ''
        if (typeof value === 'boolean')
          return `${key}`
      },
      ...definition?.unpack,
    },
  )
}
