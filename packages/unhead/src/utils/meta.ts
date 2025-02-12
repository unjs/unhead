import type { BaseMeta, Head, MetaFlatInput } from '../types'

export interface TransformValueOptions {
  entrySeparator?: string
  keyValueSeparator?: string
  resolve?: (ctx: { key: string, value: unknown }) => string | void
}

function unpackToString<T extends Record<keyof T, unknown>>(value: T, options: TransformValueOptions): string {
  return Object.entries(value)
    .map(([key, value]) => {
      if (typeof value === 'object')
        value = unpackToString(value as Record<keyof T, any>, options)
      if (options.resolve) {
        const resolved = options.resolve({ key, value })
        if (typeof resolved !== 'undefined')
          return resolved
      }
      return `${fixKeyCase(key)}${options.keyValueSeparator || ''}${String(value)}`
    })
    .filter(Boolean)
    .join(options.entrySeparator || '')
}

interface Context { key: string, value: any }
type ResolveFn = (ctx: Context) => string

export interface UnpackArrayOptions {
  key: string | ResolveFn
  value: string | ResolveFn
  resolveKeyData?: ResolveFn
  resolveValueData?: ResolveFn
}

export function unpackToArray(input: Record<string, any>, options: UnpackArrayOptions): Record<string, any>[] {
  const unpacked: any[] = []
  const kFn = options.resolveKeyData || ((ctx: Context) => ctx.key)
  const vFn = options.resolveValueData || ((ctx: Context) => ctx.value)

  for (const [k, v] of Object.entries(input)) {
    unpacked.push(...(Array.isArray(v) ? v : [v]).flatMap((i) => {
      if (String(i) === 'false') {
        return false
      }
      const ctx = { key: k, value: i }
      const val = vFn(ctx)
      // handle nested objects
      if (typeof val === 'object')
        return unpackToArray(val!, options)

      if (Array.isArray(val))
        return val

      return {
        [typeof options.key === 'function' ? options.key(ctx) : options.key]: kFn(ctx),
        [typeof options.value === 'function' ? options.value(ctx) : options.value]: val,
      }
    }))
  }
  return unpacked.filter(Boolean)
}

interface PackingDefinition {
  metaKey?: keyof BaseMeta
  keyValue?: string
  unpack?: TransformValueOptions
}

const p = (p: string) => ({ keyValue: p, metaKey: 'property' }) as PackingDefinition
const k = (p: string) => ({ keyValue: p }) as PackingDefinition

export const MetaPackingSchema = new Map<string, PackingDefinition>([
  ['appleItunesApp', {
    unpack: {
      entrySeparator: ', ',
      resolve({ key, value }) {
        return `${fixKeyCase(key)}=${value}`
      },
    },
  }],
  ['articleExpirationTime', p('article:expiration_time')],
  ['articleModifiedTime', p('article:modified_time')],
  ['articlePublishedTime', p('article:published_time')],
  ['bookReleaseDate', p('book:release_date')],
  ['charset', { metaKey: 'charset' }],
  ['contentSecurityPolicy', {
    unpack: {
      entrySeparator: '; ',
      resolve({ key, value }) {
        return `${fixKeyCase(key)} ${value}`
      },
    },
    metaKey: 'http-equiv',
  }],
  ['contentType', { metaKey: 'http-equiv' }],
  ['defaultStyle', { metaKey: 'http-equiv' }],
  ['fbAppId', p('fb:app_id')],
  ['msapplicationConfig', k('msapplication-Config')],
  ['msapplicationTileColor', k('msapplication-TileColor')],
  ['msapplicationTileImage', k('msapplication-TileImage')],
  ['ogAudioSecureUrl', p('og:audio:secure_url')],
  ['ogAudioUrl', p('og:audio')],
  ['ogImageSecureUrl', p('og:image:secure_url')],
  ['ogImageUrl', p('og:image')],
  ['ogSiteName', p('og:site_name')],
  ['ogVideoSecureUrl', p('og:video:secure_url')],
  ['ogVideoUrl', p('og:video')],
  ['profileFirstName', p('profile:first_name')],
  ['profileLastName', p('profile:last_name')],
  ['profileUsername', p('profile:username')],
  ['refresh', {
    metaKey: 'http-equiv',
    unpack: {
      entrySeparator: ';',
      resolve({ key, value }) {
        if (key === 'seconds')
          return `${value}`
      },
    },
  }],
  ['robots', {
    unpack: {
      entrySeparator: ', ',
      resolve({ key, value }) {
        if (!value) {
          return false
        }
        if (typeof value === 'boolean')
          return `${fixKeyCase(key)}`
        return `${fixKeyCase(key)}:${value}`
      },
    },
  }],
  ['xUaCompatible', { metaKey: 'http-equiv' }],
])

const openGraphNamespaces = new Set([
  'og',
  'book',
  'article',
  'profile',
])

export function resolveMetaKeyType(key: string): keyof BaseMeta {
  const fKey = fixKeyCase(key)
  const prefixIndex = fKey.indexOf(':')
  if (openGraphNamespaces.has(fKey.substring(0, prefixIndex)))
    return 'property'
  return MetaPackingSchema.get(key)?.metaKey || 'name'
}

export function resolveMetaKeyValue(key: string): string {
  return MetaPackingSchema.get(key)?.keyValue || fixKeyCase(key)
}

const UPPERCASE_PATTERN = /([A-Z])/g

function fixKeyCase(key: string) {
  const updated = key.replace(UPPERCASE_PATTERN, '-$1').toLowerCase()
  const prefixIndex = updated.indexOf('-')
  const fKey = updated.substring(0, prefixIndex)
  if (fKey === 'twitter' || openGraphNamespaces.has(fKey))
    return key.replace(UPPERCASE_PATTERN, ':$1').toLowerCase()
  return updated
}

export function resolvePackedMetaObjectValue(value: string, key: string): string {
  const definition = MetaPackingSchema.get(key)
  // refresh is weird...
  if (key === 'refresh')
    // @ts-expect-error untyped
    return `${value.seconds};url=${value.url}`
  return unpackToString(
    value,
    {
      keyValueSeparator: '=',
      entrySeparator: ', ',
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

const ObjectArrayEntries = new Set(['og:image', 'og:video', 'og:audio', 'twitter:image'])

function handleObjectEntry(key: string, v: Record<string, any>) {
  // filter out falsy values
  const fKey = fixKeyCase(key)
  const attr = resolveMetaKeyType(fKey)
  if (ObjectArrayEntries.has(fKey as keyof MetaFlatInput)) {
    const input: MetaFlatInput = {}
    for (const k in v) {
      if (!Object.prototype.hasOwnProperty.call(v, k)) {
        continue
      }

      // we need to prefix the keys with og:
      if (String(v[k]) !== 'false') {
        // @ts-expect-error untyped
        input[`${key}${k === 'url' ? '' : `${k[0].toUpperCase()}${k.slice(1)}`}`] = v[k]
      }
    }
    return unpackMeta(input)
      // sort by property name
      // @ts-expect-error untyped
      .sort((a, b) => (a[attr]?.length || 0) - (b[attr]?.length || 0)) as BaseMeta[]
  }
  return [{ [attr]: fKey, ...v }] as BaseMeta[]
}

/**
 * Converts a flat meta object into an array of meta entries.
 * @param input
 */
export function unpackMeta<T extends MetaFlatInput>(input: T): Required<Head>['meta'] {
  const extras: BaseMeta[] = []
  // need to handle array input of the object
  const primitives: Record<string, any> = {}
  for (const key in input) {
    if (!Object.prototype.hasOwnProperty.call(input, key)) {
      continue
    }

    const value = input[key]

    if (!Array.isArray(value)) {
      if (typeof value === 'object' && value) {
        if (ObjectArrayEntries.has(fixKeyCase(key) as keyof MetaFlatInput)) {
          extras.push(...handleObjectEntry(key, value))
          continue
        }
      }
      primitives[key] = value
      continue
    }
    for (const v of value) {
      extras.push(...(typeof v === 'string' ? unpackMeta({ [key]: v }) as BaseMeta[] : handleObjectEntry(key, v)))
    }
  }

  const meta = unpackToArray((primitives), {
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
  }) as BaseMeta[]
  // remove keys with defined but empty content
  return [...extras, ...meta].map((m) => {
    if (m.content === '_null')
      m.content = null
    return m
  }) as unknown as Required<Head>['meta']
}
