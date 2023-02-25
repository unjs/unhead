import type { Head, MetaFlatInput } from '@unhead/schema'
import { unpackToArray, unpackToString } from 'packrup'
import { changeKeyCasingDeep, fixKeyCase } from '..'
import { MetaPackingSchema, resolveMetaKeyType } from './utils'

const ArrayableInputs = ['Image', 'Video', 'Audio']
/**
 * Converts a flat meta object into an array of meta entries.
 * @param input
 */
export function unpackMeta<T extends MetaFlatInput>(input: T): Required<Head>['meta'] {
  const extras: Record<string, any>[] = []

  ArrayableInputs.forEach((key) => {
    const ogKey = `og:${key.toLowerCase()}`
    const inputKey = `og${key}` as keyof MetaFlatInput
    const val = input[inputKey]
    if (typeof val === 'object') {
      (Array.isArray(val) ? val : [val])
        .forEach((entry) => {
          if (!entry)
            return
          const unpackedEntry = unpackToArray(entry as Record<string, any>, {
            key: 'property',
            value: 'content',
            resolveKeyData({ key }) {
              return fixKeyCase(`${ogKey}${key !== 'url' ? `:${key}` : ''}`)
            },
            resolveValueData({ value }) {
              return typeof value === 'number' ? value.toString() : value
            },
          })
          extras.push(
            // need to sort the entry and make sure the `og:image` is first
            ...unpackedEntry.sort((a, b) => (a.property === ogKey ? -1 : b.property === ogKey ? 1 : 0)),
          )
        })
      delete input[inputKey]
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
      return MetaPackingSchema[key]?.keyValue || fixKeyCase(key)
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
