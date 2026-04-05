import type { MetaFlat, MetaGeneric, ResolvableHead, UnheadMeta } from '../types'
import { MetaTagsArrayable } from './const'

type MetaKeyType = 'name' | 'property' | 'http-equiv'

export const NAMESPACES = {
  META: /* @__PURE__ */ new Set(['twitter', 'fediverse']),
  OG: /* @__PURE__ */ new Set(['og', 'book', 'article', 'profile', 'fb']),
  MEDIA: /* @__PURE__ */ new Set(['ogImage', 'ogVideo', 'ogAudio', 'twitterImage']),
  HTTP_EQUIV: /* @__PURE__ */ new Set(['contentType', 'defaultStyle', 'xUaCompatible']),
} as const

const META_ALIASES: Record<string, string> = /* @__PURE__ */ Object.fromEntries(
  'articleExpirationTime article:expiration_time,articleModifiedTime article:modified_time,articlePublishedTime article:published_time,bookReleaseDate book:release_date,fbAppId fb:app_id,ogAudioSecureUrl og:audio:secure_url,ogAudioUrl og:audio,ogImageSecureUrl og:image:secure_url,ogImageUrl og:image,ogSiteName og:site_name,ogVideoSecureUrl og:video:secure_url,ogVideoUrl og:video,profileFirstName profile:first_name,profileLastName profile:last_name,profileUsername profile:username,msapplicationConfig msapplication-Config,msapplicationTileColor msapplication-TileColor,msapplicationTileImage msapplication-TileImage'
    .split(',').map(e => e.split(' ')),
)

const CAPS_RE = /([A-Z])/g
const OG_TWITTER_RE = /^(?:og|twitter)/

interface UnpackOptions {
  entrySeparator?: string
  keyValueSeparator?: string
  wrapValue?: string
  resolve?: (ctx: { key: string, value: any }) => string | void
}

interface MetaPackingEntry {
  metaKey?: string
  unpack?: UnpackOptions
}

const _r = (entrySeparator: string, resolve: UnpackOptions['resolve']): MetaPackingEntry => ({ unpack: { entrySeparator, resolve } })

export const MetaPackingSchema: Record<string, MetaPackingEntry> = /* @__PURE__ */ {
  appleItunesApp: _r(', ', ({ key, value }) => `${fixKeyCase(key)}=${value}`),
  refresh: { metaKey: 'http-equiv', unpack: { entrySeparator: ';', resolve: ({ key, value }) => key === 'seconds' ? `${value}` : undefined } },
  robots: _r(', ', ({ key, value }) => typeof value === 'boolean' ? fixKeyCase(key) : `${fixKeyCase(key)}:${value}`),
  contentSecurityPolicy: { metaKey: 'http-equiv', unpack: { entrySeparator: '; ', resolve: ({ key, value }) => `${fixKeyCase(key)} ${value}` } },
  charset: {},
}

function fixKeyCase(key: string): string {
  const updated = key.replace(CAPS_RE, '-$1').toLowerCase()
  const prefixIndex = updated.indexOf('-')
  return prefixIndex === -1
    ? updated
    : (
        NAMESPACES.META.has(updated.slice(0, prefixIndex)) || NAMESPACES.OG.has(updated.slice(0, prefixIndex))
          ? key.replace(CAPS_RE, ':$1').toLowerCase()
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

function unpackToString(value: Record<string, any>, options: UnpackOptions = {}): string {
  const { entrySeparator = '', keyValueSeparator = '', wrapValue, resolve } = options
  return Object.entries(value).map(([key, val]) => {
    const resolved = resolve?.({ key, value: val })
    if (resolved !== undefined) return resolved
    const pv = typeof val === 'object' ? unpackToString(val, options)
      : typeof val === 'number' ? val.toString()
        : typeof val === 'string' && wrapValue ? `${wrapValue}${val.replace(new RegExp(wrapValue, 'g'), `\\${wrapValue}`)}${wrapValue}` : val
    return `${key}${keyValueSeparator}${pv}`
  }).join(entrySeparator)
}

function handleObjectEntry(key: string, value: Record<string, any>): UnheadMeta[] {
  const sanitizedValue = sanitizeObject(value)
  const fixedKey = fixKeyCase(key)
  const attr = resolveMetaKeyType(fixedKey)

  if (!MetaTagsArrayable.has(fixedKey as keyof MetaFlat)) {
    return [{ [attr]: fixedKey, ...sanitizedValue }] as UnheadMeta[]
  }

  const input = Object.fromEntries(
    Object.entries(sanitizedValue)
      .map(([k, v]) => [`${key}${k === 'url' ? '' : `${k[0].toUpperCase()}${k.slice(1)}`}`, v]),
  )
  return (unpackMeta(input || {}) as UnheadMeta[])
    .sort((a: any, b: any) => ((a[attr]?.length || 0) - (b[attr]?.length || 0)))
}

export function resolveMetaKeyType(key: string): MetaKeyType {
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
  return META_ALIASES[key] || fixKeyCase(key)
}

export function resolvePackedMetaObjectValue(value: any, key: string): string {
  if (key === 'refresh')
    return `${value.seconds};url=${value.url}`

  return unpackToString(transformObject(value), {
    keyValueSeparator: '=',
    entrySeparator: ', ',
    resolve: ({ value, key }) => value === null ? '' : (typeof value === 'boolean' ? key : undefined),
    ...MetaPackingSchema[key]?.unpack,
  })
}

export function unpackMeta<T extends MetaFlat>(input: T): Required<ResolvableHead>['meta'] {
  const extras: UnheadMeta[] = []
  const primitives: Record<string, any> = {}

  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      if (key === 'themeColor') {
        for (const v of value)
          if (typeof v === 'object' && v !== null) extras.push({ name: 'theme-color', ...v })
        continue
      }
      for (const v of value) {
        if (typeof v === 'object' && v !== null) {
          const urlProps: UnheadMeta[] = []
          const otherProps: UnheadMeta[] = []
          for (const [pk, pv] of Object.entries(v)) {
            const m = unpackMeta({ [`${key}${pk === 'url' ? '' : `:${pk}`}`]: pv }) as UnheadMeta[]
            ;(pk === 'url' ? urlProps : otherProps).push(...m)
          }
          extras.push(...urlProps, ...otherProps)
        }
        else {
          extras.push(...(typeof v === 'string' ? unpackMeta({ [key]: v }) as UnheadMeta[] : handleObjectEntry(key, v)))
        }
      }
      continue
    }

    if (typeof value === 'object' && value) {
      if (NAMESPACES.MEDIA.has(key)) {
        const prefix = key.startsWith('twitter') ? 'twitter' : 'og'
        const type = key.replace(OG_TWITTER_RE, '').toLowerCase()
        const mk = prefix === 'twitter' ? 'name' : 'property'
        const base = `${prefix}:${type}`
        if (value.url) extras.push({ [mk]: base, content: value.url } as MetaGeneric as UnheadMeta)
        if (value.secureUrl) extras.push({ [mk]: `${base}:secure_url`, content: value.secureUrl } as MetaGeneric as UnheadMeta)
        for (const [pk, pv] of Object.entries(value)) {
          if (pk !== 'url' && pk !== 'secureUrl')
            extras.push({ [mk]: `${base}:${pk}`, content: pv } as MetaGeneric as UnheadMeta)
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

  const meta = Object.entries(primitives).map(([key, value]): UnheadMeta => {
    if (key === 'charset')
      return { charset: value === null ? '_null' : value }
    const mk = resolveMetaKeyType(key)
    const kv = resolveMetaKeyValue(key)
    const cv = value === null ? '_null' : typeof value === 'object' ? resolvePackedMetaObjectValue(value, key) : typeof value === 'number' ? value.toString() : value
    return (mk === 'http-equiv' ? { 'http-equiv': kv, 'content': cv } : { [mk]: kv, content: cv }) as MetaGeneric as UnheadMeta
  })

  return [...extras, ...meta].map(m =>
    !('content' in m) ? m : m.content === '_null' ? { ...m, content: null } : m,
  ) as Required<ResolvableHead>['meta']
}
