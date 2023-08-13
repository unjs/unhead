import { packArray, unpackToArray, unpackToString } from 'packrup'
import type { TransformValueOptions } from 'packrup'
import type { Head, MetaFlatInput } from '@unhead/schema'

export type ValidMetaType = 'name' | 'http-equiv' | 'property' | 'charset'

interface PackingDefinition {
  metaKey?: ValidMetaType
  keyValue?: string
  unpack?: TransformValueOptions
}

const MetaPackingSchema: Record<string, PackingDefinition> = {
  robots: {
    unpack: {
      keyValueSeparator: ':',
    },
  },
  // Pragma directives
  contentSecurityPolicy: {
    unpack: {
      keyValueSeparator: ' ',
      entrySeparator: '; ',
    },
    metaKey: 'http-equiv',
  },
  fbAppId: {
    keyValue: 'fb:app_id',
    metaKey: 'property',
  },
  ogSiteName: {
    keyValue: 'og:site_name',
  },
  msapplicationTileImage: {
    keyValue: 'msapplication-TileImage',
  },
  /**
   * Tile colour for windows
   */
  msapplicationTileColor: {
    keyValue: 'msapplication-TileColor',
  },
  /**
   * URL of a config for windows tile.
   */
  msapplicationConfig: {
    keyValue: 'msapplication-Config',
  },
  charset: {
    metaKey: 'charset',
  },
  contentType: {
    metaKey: 'http-equiv',
  },
  defaultStyle: {
    metaKey: 'http-equiv',
  },
  xUaCompatible: {
    metaKey: 'http-equiv',
  },
  refresh: {
    metaKey: 'http-equiv',
  },
} as const

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

const OpenGraphInputs = ['og:Image', 'og:Video', 'og:Audio', 'twitter:Image']

const SimpleArrayUnpackMetas: (keyof MetaFlatInput)[] = ['themeColor']

/**
 * Converts a flat meta object into an array of meta entries.
 * @param input
 */
export function unpackMeta<T extends MetaFlatInput>(input: T): Required<Head>['meta'] {
  const extras: Record<string, any>[] = []

  OpenGraphInputs.forEach((key) => {
    const propKey = key.toLowerCase()
    const inputKey = `${key.replace(':', '')}` as keyof MetaFlatInput
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

/**
 * Convert an array of meta entries to a flat object.
 * @param inputs
 */
export function packMeta<T extends Required<Head>['meta']>(inputs: T): MetaFlatInput {
  const mappedPackingSchema = Object.entries(MetaPackingSchema)
    .map(([key, value]) => [key, value.keyValue])

  return packArray(inputs, {
    key: ['name', 'property', 'httpEquiv', 'http-equiv', 'charset'],
    value: ['content', 'charset'],
    resolveKey(k) {
      let key = (mappedPackingSchema.filter(sk => sk[1] === k)?.[0]?.[0] || k) as string
      // turn : into a capital letter
      // @ts-expect-error untyped
      const replacer = (_, letter) => letter?.toUpperCase()
      key = key
        .replace(/:([a-z])/g, replacer)
        .replace(/-([a-z])/g, replacer)
      return key as string
    },
  })
}
