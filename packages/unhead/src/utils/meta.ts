import type { BaseMeta, MetaFlat, ResolvableHead } from '../types'
import { MetaTagsArrayable } from './const'

export const NAMESPACES = /* @__PURE__ */ {
  META: new Set(['twitter']),
  OG: new Set(['og', 'book', 'article', 'profile', 'fb']),
  MEDIA: new Set(['ogImage', 'ogVideo', 'ogAudio', 'twitterImage']),
  HTTP_EQUIV: new Set(['contentType', 'defaultStyle', 'xUaCompatible']),
} as const

const META_ALIASES = /* @__PURE__ */ {
  articleExpirationTime: 'article:expiration_time',
  articleModifiedTime: 'article:modified_time',
  articlePublishedTime: 'article:published_time',
  bookReleaseDate: 'book:release_date',
  fbAppId: 'fb:app_id',
  ogAudioSecureUrl: 'og:audio:secure_url',
  ogAudioUrl: 'og:audio',
  ogImageSecureUrl: 'og:image:secure_url',
  ogImageUrl: 'og:image',
  ogSiteName: 'og:site_name',
  ogVideoSecureUrl: 'og:video:secure_url',
  ogVideoUrl: 'og:video',
  profileFirstName: 'profile:first_name',
  profileLastName: 'profile:last_name',
  profileUsername: 'profile:username',
  msapplicationConfig: 'msapplication-Config',
  msapplicationTileColor: 'msapplication-TileColor',
  msapplicationTileImage: 'msapplication-TileImage',
} as const

export const MetaPackingSchema = /* @__PURE__ */ {
  appleItunesApp: {
    unpack: {
      entrySeparator: ', ',
      // @ts-expect-error untyped
      resolve: ({ key, value }) => `${fixKeyCase(key)}=${value}`,
    },
  },
  refresh: {
    metaKey: 'http-equiv',
    unpack: {
      entrySeparator: ';',
      // @ts-expect-error untyped
      resolve: ({ key, value }) => key === 'seconds' ? `${value}` : undefined,
    },
  },
  robots: {
    unpack: {
      entrySeparator: ', ',
      // @ts-expect-error untyped
      resolve: ({ key, value }) =>
        typeof value === 'boolean' ? fixKeyCase(key) : `${fixKeyCase(key)}:${value}`,
    },
  },
  contentSecurityPolicy: {
    metaKey: 'http-equiv',
    unpack: {
      entrySeparator: '; ',
      // @ts-expect-error untyped
      resolve: ({ key, value }) => `${fixKeyCase(key)} ${value}`,
    },
  },
  charset: {},
} as const

function fixKeyCase(key: string): string {
  const updated = key.replace(/([A-Z])/g, '-$1').toLowerCase()
  const prefixIndex = updated.indexOf('-')
  return prefixIndex === -1
    ? updated
    : (
        NAMESPACES.META.has(updated.slice(0, prefixIndex)) || NAMESPACES.OG.has(updated.slice(0, prefixIndex))
          ? key.replace(/([A-Z])/g, ':$1').toLowerCase()
          : updated
      )
}

function sanitizeObject(input: Record<string, any>) {
  return Object.fromEntries(Object.entries(input).filter(([k, v]) => String(v) !== 'false' && k))
}

function transformObject(obj: any): any {
  return Array.isArray(obj)
    ? obj.map(transformObject)
    : !obj || typeof obj !== 'object'
        ? obj
        : Object.fromEntries(Object.entries(obj).map(([k, v]) => [fixKeyCase(k), transformObject(v)]))
}

// @ts-expect-error untyped
function unpackToString(value: Record<string, any>, options: {
  entrySeparator?: string
  keyValueSeparator?: string
  wrapValue?: string
  resolve?: (ctx: { key: string, value: any }) => string | void
} = {}) {
  const { entrySeparator = '', keyValueSeparator = '', wrapValue, resolve } = options
  // @ts-expect-error untyped
  return Object.entries(value).map(([key, val]) => {
    if (resolve) {
      const resolved = resolve({ key, value: val })
      if (resolved !== undefined)
        return resolved
    }

    // @ts-expect-error untyped
    const processedVal = typeof val === 'object'
      ? unpackToString(val, options)
      : typeof val === 'number'
        ? val.toString()
        : typeof val === 'string' && wrapValue
          ? `${wrapValue}${val.replace(new RegExp(wrapValue, 'g'), `\\${wrapValue}`)}${wrapValue}`
          : val

    return `${key}${keyValueSeparator}${processedVal}`
  }).join(entrySeparator)
}

function handleObjectEntry(key: string, value: Record<string, any>): BaseMeta[] {
  const sanitizedValue = sanitizeObject(value)
  const fixedKey = fixKeyCase(key)
  const attr = resolveMetaKeyType(fixedKey)

  if (!MetaTagsArrayable.has(fixedKey as keyof MetaFlat)) {
    return [{ [attr]: fixedKey, ...sanitizedValue }] as BaseMeta[]
  }

  const input = Object.fromEntries(
    Object.entries(sanitizedValue)
      .map(([k, v]) => [`${key}${k === 'url' ? '' : `${k[0].toUpperCase()}${k.slice(1)}`}`, v]),
  )
  // @ts-expect-error untyped
  return unpackMeta(input || {})
    // @ts-expect-error untyped
    .sort((a, b) => ((a[attr]?.length || 0) - (b[attr]?.length || 0))) as BaseMeta[]
}

export function resolveMetaKeyType(key: string): keyof BaseMeta {
  // @ts-expect-error untyped
  if (MetaPackingSchema[key]?.metaKey === 'http-equiv' || NAMESPACES.HTTP_EQUIV.has(key)) {
    return 'http-equiv'
  }

  const fixed = fixKeyCase(key)
  const colonIndex = fixed.indexOf(':')
  return colonIndex === -1
    ? 'name'
    : NAMESPACES.OG.has(fixed.slice(0, colonIndex))
      ? 'property'
      : 'name'
}

export function resolveMetaKeyValue(key: string): string {
  // @ts-expect-error untyped
  return META_ALIASES[key] || fixKeyCase(key)
}

export function resolvePackedMetaObjectValue(value: string, key: string): string {
  if (key === 'refresh')
    // @ts-expect-error untyped
    return `${value.seconds};url=${value.url}`

  return unpackToString(transformObject(value), {
    keyValueSeparator: '=',
    entrySeparator: ', ',
    resolve: ({ value, key }) => value === null ? '' : (typeof value === 'boolean' ? key : undefined),
    // @ts-expect-error untyped
    ...MetaPackingSchema[key]?.unpack,
  })
}

export function unpackMeta<T extends MetaFlat>(input: T): Required<ResolvableHead>['meta'] {
  const extras: BaseMeta[] = []
  const primitives: Record<string, any> = {}

  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      if (key === 'themeColor') {
        value.forEach((v) => {
          if (typeof v === 'object' && v !== null) {
            extras.push({ name: 'theme-color', ...v })
          }
        })
        continue
      }

      for (const v of value) {
        if (typeof v === 'object' && v !== null) {
          // @ts-expect-error untyped
          const urlProps = []
          // @ts-expect-error untyped
          const otherProps = []

          for (const [propKey, propValue] of Object.entries(v)) {
            const metaKey = `${key}${propKey === 'url' ? '' : `:${propKey}`}`
            // @ts-expect-error untyped
            const meta = unpackMeta({ [metaKey]: propValue }) as BaseMeta[]
            // @ts-expect-error untyped
            ;(propKey === 'url' ? urlProps : otherProps).push(...meta)
          }
          // @ts-expect-error untyped
          extras.push(...urlProps, ...otherProps)
        }
        else {
          extras.push(...(typeof v === 'string'
            // @ts-expect-error untyped
            ? unpackMeta({ [key]: v }) as BaseMeta[]
            : handleObjectEntry(key, v)))
        }
      }
      continue
    }

    if (typeof value === 'object' && value) {
      if (NAMESPACES.MEDIA.has(key)) {
        const prefix = key.startsWith('twitter') ? 'twitter' : 'og'
        const type = key.replace(/^(og|twitter)/, '').toLowerCase()
        const metaKey = prefix === 'twitter' ? 'name' : 'property'

        if (value.url) {
          extras.push({
            [metaKey]: `${prefix}:${type}`,
            content: value.url,
          })
        }
        if (value.secureUrl) {
          extras.push({
            [metaKey]: `${prefix}:${type}:secure_url`,
            content: value.secureUrl,
          })
        }

        for (const [propKey, propValue] of Object.entries(value)) {
          if (propKey !== 'url' && propKey !== 'secureUrl') {
            extras.push({
              [metaKey]: `${prefix}:${type}:${propKey}`,
              // @ts-expect-error untyped
              content: propValue,
            })
          }
        }
      }
      else if (MetaTagsArrayable.has(fixKeyCase(key) as keyof MetaFlat)) {
        extras.push(...handleObjectEntry(key, value))
      }
      else {
        primitives[key] = sanitizeObject(value)
      }
    }
    else {
      primitives[key] = value
    }
  }

  const meta = Object.entries(primitives).map(([key, value]): BaseMeta => {
    if (key === 'charset')
      return { charset: value === null ? '_null' : value }

    const metaKey = resolveMetaKeyType(key)
    const keyValue = resolveMetaKeyValue(key)
    const processedValue = value === null
      ? '_null'
      : typeof value === 'object'
        ? resolvePackedMetaObjectValue(value, key)
        : typeof value === 'number'
          ? value.toString()
          : value

    return metaKey === 'http-equiv'
      ? { 'http-equiv': keyValue, 'content': processedValue }
      : { [metaKey]: keyValue, content: processedValue }
  }) as BaseMeta[]

  return [...extras, ...meta].map(m =>
    !('content' in m)
      ? m
      : m.content === '_null'
        ? { ...m, content: null }
        : m,
  ) as Required<ResolvableHead>['meta']
}
