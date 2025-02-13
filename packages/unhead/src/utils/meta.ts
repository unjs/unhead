import type { BaseMeta, Head, MetaFlatInput } from '../types'
import { MetaTagsArrayable } from './const'

interface Context { key: string, value: any }
interface PackingDefinition {
  metaKey?: keyof BaseMeta
  keyValue?: string
  unpack?: {
    entrySeparator?: string
    keyValueSeparator?: string
    wrapValue?: string
    resolve?: (ctx: Context) => string | void
  }
}

const createPacking = (keyValue: string, metaKey: keyof BaseMeta = 'property'): PackingDefinition => ({ keyValue, metaKey })

const MetaPackingSchema: Record<string, PackingDefinition> = {
  appleItunesApp: { unpack: { entrySeparator: ', ', resolve: ({ key, value }) => `${fixKeyCase(key)}=${value}` } },
  refresh: {
    metaKey: 'http-equiv',
    unpack: {
      entrySeparator: ';',
      resolve: ({ key, value }) => key === 'seconds' ? `${value}` : undefined,
    },
  },
  robots: {
    unpack: {
      entrySeparator: ', ',
      resolve: ({ key, value }) => typeof value === 'boolean' ? fixKeyCase(key) : `${fixKeyCase(key)}:${value}`,
    },
  },
  contentSecurityPolicy: {
    metaKey: 'http-equiv',
    unpack: {
      entrySeparator: '; ',
      resolve: ({ key, value }) => `${fixKeyCase(key)} ${value}`,
    },
  },
  ...Object.fromEntries([
    ['articleExpirationTime', 'article:expiration_time'],
    ['articleModifiedTime', 'article:modified_time'],
    ['articlePublishedTime', 'article:published_time'],
    ['bookReleaseDate', 'book:release_date'],
    ['fbAppId', 'fb:app_id'],
    ['ogAudioSecureUrl', 'og:audio:secure_url'],
    ['ogAudioUrl', 'og:audio'],
    ['ogImageSecureUrl', 'og:image:secure_url'],
    ['ogImageUrl', 'og:image'],
    ['ogSiteName', 'og:site_name'],
    ['ogVideoSecureUrl', 'og:video:secure_url'],
    ['ogVideoUrl', 'og:video'],
    ['profileFirstName', 'profile:first_name'],
    ['profileLastName', 'profile:last_name'],
    ['profileUsername', 'profile:username'],
  ].map(([k, v]) => [k, createPacking(v)])),
  charset: {}, // Changed to empty object since charset is special case
  ...Object.fromEntries([
    'contentType',
    'defaultStyle',
    'xUaCompatible',
  ].map(k => [k, { metaKey: 'http-equiv' }])),
  ...Object.fromEntries([
    ['msapplicationConfig', 'msapplication-Config'],
    ['msapplicationTileColor', 'msapplication-TileColor'],
    ['msapplicationTileImage', 'msapplication-TileImage'],
  ].map(([k, v]) => [k, { keyValue: v }])),
}

const OPEN_GRAPH_NAMESPACES = new Set(['og', 'book', 'article', 'profile'])

function fixKeyCase(key: string): string {
  const updated = key.replace(/([A-Z])/g, '-$1').toLowerCase()
  const prefixIndex = updated.indexOf('-')
  const prefix = updated.substring(0, prefixIndex)
  return (prefix === 'twitter' || OPEN_GRAPH_NAMESPACES.has(prefix))
    ? key.replace(/([A-Z])/g, ':$1').toLowerCase()
    : updated
}

function sanitizeObject(input: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(input)
      .filter(([k, v]) => String(v) !== 'false' && k),
  )
}

function transformObject(obj: any): any {
  if (Array.isArray(obj))
    return obj.map(transformObject)
  if (typeof obj !== 'object' || !obj)
    return obj

  return Object.fromEntries(
    Object.entries(obj)
      .map(([k, v]) => [fixKeyCase(k), transformObject(v)]),
  )
}

function unpackToString(value: Record<string, any>, options: PackingDefinition['unpack'] = {}): string {
  const { entrySeparator = '', keyValueSeparator = '', wrapValue, resolve } = options

  return Object.entries(value)
    .map(([key, val]) => {
      if (resolve) {
        const resolved = resolve({ key, value: val })
        if (resolved !== undefined)
          return resolved
      }

      let processedVal = val
      if (typeof val === 'object')
        processedVal = unpackToString(val, options)
      if (typeof val === 'number')
        processedVal = val.toString()
      if (typeof val === 'string' && wrapValue) {
        processedVal = val.replace(new RegExp(wrapValue, 'g'), `\\${wrapValue}`)
        processedVal = `${wrapValue}${processedVal}${wrapValue}`
      }

      return `${key}${keyValueSeparator}${processedVal}`
    })
    .join(entrySeparator)
}

function handleObjectEntry(key: string, value: Record<string, any>): BaseMeta[] {
  const sanitizedValue = sanitizeObject(value)
  const fixedKey = fixKeyCase(key)
  const attr = resolveMetaKeyType(fixedKey)

  if (MetaTagsArrayable.has(fixedKey as keyof MetaFlatInput)) {
    const input = Object.fromEntries(
      Object.entries(sanitizedValue)
        .map(([k, v]) => [`${key}${k === 'url' ? '' : `${k[0].toUpperCase()}${k.slice(1)}`}`, v]),
    )
    // @ts-expect-error untyped
    return unpackMeta(input).sort((a, b) => ((a[attr]?.length || 0) - (b[attr]?.length || 0))) as BaseMeta[]
  }

  return [{ [attr]: fixedKey, ...sanitizedValue }] as BaseMeta[]
}

export function resolveMetaKeyType(key: string): keyof BaseMeta {
  const fixedKey = fixKeyCase(key)
  const prefixIndex = fixedKey.indexOf(':')
  const prefix = fixedKey.substring(0, prefixIndex)

  if (prefix === 'twitter')
    return 'name'

  return OPEN_GRAPH_NAMESPACES.has(prefix)
    ? 'property'
    : MetaPackingSchema[key]?.metaKey || 'name'
}

export function resolveMetaKeyValue(key: string): string {
  return MetaPackingSchema[key]?.keyValue || fixKeyCase(key)
}

export function resolvePackedMetaObjectValue(value: string, key: string): string {
  if (key === 'refresh')
    // @ts-expect-error untyped
    return `${value.seconds};url=${value.url}`

  return unpackToString(
    transformObject(value),
    {
      keyValueSeparator: '=',
      entrySeparator: ', ',
      resolve: ({ value, key }) => value === null ? '' : (typeof value === 'boolean' ? key : undefined),
      ...MetaPackingSchema[key]?.unpack,
    },
  )
}

// Add to top of file
const MEDIA_PROPERTIES = new Set(['ogImage', 'ogVideo', 'ogAudio', 'twitterImage'])

export function unpackMeta<T extends MetaFlatInput>(input: T): Required<Head>['meta'] {
  const extras: BaseMeta[] = []
  const primitives: Record<string, any> = {}

  Object.entries(input).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (key === 'themeColor') {
        value.forEach((v) => {
          if (typeof v === 'object' && v !== null) {
            extras.push({
              name: 'theme-color',
              ...v,
            })
          }
        })
      }
      else {
        value.forEach((v) => {
          if (typeof v === 'object' && v !== null) {
            // Create ordered array of properties with URL first
            // @ts-expect-error untyped
            const urlProps = []
            // @ts-expect-error untyped
            const otherProps = []

            Object.entries(v).forEach(([propKey, propValue]) => {
              const metaKey = `${key}${propKey === 'url' ? '' : `:${propKey}`}`
              const meta = unpackMeta({ [metaKey]: propValue }) as BaseMeta[]
              if (propKey === 'url') {
                urlProps.push(...meta)
              }
              else {
                otherProps.push(...meta)
              }
            })
            // @ts-expect-error untyped
            extras.push(...urlProps, ...otherProps)
          }
          else {
            extras.push(...(typeof v === 'string'
              ? unpackMeta({ [key]: v }) as BaseMeta[]
              : handleObjectEntry(key, v)))
          }
        })
      }
    }
    else if (typeof value === 'object' && value) {
      if (MEDIA_PROPERTIES.has(key)) {
        const prefix = key.startsWith('twitter') ? 'twitter' : 'og'
        const type = key.replace(/^(og|twitter)/, '').toLowerCase()
        const metaKey = prefix === 'twitter' ? 'name' : 'property'

        // First add the URL tags
        // @ts-expect-error untyped
        if (value.url) {
          extras.push({
            [metaKey]: `${prefix}:${type}`,
            // @ts-expect-error untyped
            content: value.url,
          })
        }
        // @ts-expect-error untyped
        if (value.secureUrl) {
          extras.push({
            [metaKey]: `${prefix}:${type}:secure_url`,
            // @ts-expect-error untyped
            content: value.secureUrl,
          })
        }

        // Then add all other properties
        Object.entries(value).forEach(([propKey, propValue]) => {
          if (propKey !== 'url' && propKey !== 'secureUrl') {
            extras.push({
              [metaKey]: `${prefix}:${type}:${propKey}`,
              content: propValue,
            })
          }
        })
      }
      else if (MetaTagsArrayable.has(fixKeyCase(key) as keyof MetaFlatInput)) {
        extras.push(...handleObjectEntry(key, value))
      }
      else {
        primitives[key] = sanitizeObject(value)
      }
    }
    else {
      primitives[key] = value
    }
  })

  const meta = Object.entries(primitives).map(([key, value]) => {
    if (key === 'charset') {
      return {
        charset: value === null ? '_null' : value,
      }
    }

    return {
      [resolveMetaKeyType(key)]: resolveMetaKeyValue(key),
      [key === 'charset' ? 'charset' : 'content']:
        value === null
          ? '_null'
          : typeof value === 'object'
            ? resolvePackedMetaObjectValue(value, key)
            : typeof value === 'number' ? value.toString() : value,
    }
  }) as BaseMeta[]

  return [...extras, ...meta].map((m) => {
    if (m.content === '_null')
      m.content = null
    return m
  }) as Required<Head>['meta']
}
