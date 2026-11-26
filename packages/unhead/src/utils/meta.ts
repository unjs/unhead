import type { MetaFlat, MetaGeneric, UnheadMeta } from '../types'
import { MetaTagsArrayable } from './const'

export type MetaKeyType = 'name' | 'property' | 'http-equiv'

const META_NAMESPACES: readonly string[] = ['twitter', 'fediverse']
const PROPERTY_NAMESPACES: readonly string[] = ['og', 'book', 'article', 'profile', 'fb', 'payment']
const MEDIA_KEYS: readonly string[] = ['ogImage', 'ogVideo', 'ogAudio', 'twitterImage']
const HTTP_EQUIV_KEYS: readonly string[] = ['contentType', 'defaultStyle', 'xUaCompatible', 'refresh', 'contentSecurityPolicy']

const CAPS_RE = /([A-Z])/g
const HYPHEN_OR_CAP_RE = /[-A-Z]/
const OG_TWITTER_RE = /^(?:og|twitter)/
const MSAPP_ALIAS_RE = /^msapplication(?:Config|TileColor|TileImage)$/
const OG_MEDIA_URL_RE = /^og(?:Audio|Image|Video)Url$/
const UNDERSCORE_ALIAS_RE = /^(?:article(?:Expiration|Modified|Published)Time|bookReleaseDate|fbAppId|og(?:SiteName|(?:Audio|Image|Video)SecureUrl)|payment(?:ExpiresAt|SuccessUrl)|profile(?:First|Last)Name)$/

interface UnpackOptions {
  entrySeparator?: string
  keyValueSeparator?: string
  resolve?: (ctx: { key: string, value: any }) => string | void
}

const MetaPackingUnpack: Record<string, UnpackOptions> = /* @__PURE__ */ {
  appleItunesApp: {
    entrySeparator: ', ',
    resolve: ({ key, value }) => `${fixKeyCase(key)}=${value}`,
  },
  robots: {
    entrySeparator: ', ',
    resolve: ({ key, value }) =>
      typeof value === 'boolean' ? fixKeyCase(key) : `${fixKeyCase(key)}:${value}`,
  },
  contentSecurityPolicy: {
    entrySeparator: '; ',
    resolve: ({ key, value }) => `${fixKeyCase(key)} ${value}`,
  },
}

function fixKeyCase(key: string): string {
  const prefixIndex = key.search(HYPHEN_OR_CAP_RE)
  if (prefixIndex === -1)
    return key.toLowerCase()
  const prefix = key.slice(0, prefixIndex).toLowerCase()
  const replacement = META_NAMESPACES.includes(prefix) || PROPERTY_NAMESPACES.includes(prefix) ? ':$1' : '-$1'
  return key.replace(CAPS_RE, replacement).toLowerCase()
}

function resolveAlias(key: string, fixed: string): string {
  if (MSAPP_ALIAS_RE.test(key))
    return `msapplication-${key.slice(13)}`
  if (OG_MEDIA_URL_RE.test(key))
    return fixed.slice(0, -4)
  if (UNDERSCORE_ALIAS_RE.test(key)) {
    const lastColon = fixed.lastIndexOf(':')
    return `${fixed.slice(0, lastColon)}_${fixed.slice(lastColon + 1)}`
  }
  return fixed
}

function sanitizeObject(input: Record<string, any>) {
  return Object.fromEntries(Object.entries(input).filter(([k, v]) => String(v) !== 'false' && k))
}

/**
 * Flips the robots directives that invert rather than disappear, so
 * `sanitizeObject` cannot drop them silently. `index: false` blocks indexing
 * instead of allowing it.
 */
function normalizeRobotsDirectives(input: Record<string, any>): Record<string, any> {
  if (input.index !== false && input.follow !== false)
    return input
  const value = { ...input }
  if (value.index === false) {
    delete value.index
    if (value.noindex === undefined)
      value.noindex = true
  }
  if (value.follow === false) {
    delete value.follow
    if (value.nofollow === undefined)
      value.nofollow = true
  }
  return value
}

function transformObject(obj: any): any {
  return Array.isArray(obj)
    ? obj.map(transformObject)
    : !obj || typeof obj !== 'object'
        ? obj
        : Object.fromEntries(Object.entries(obj).map(([k, v]) => [fixKeyCase(k), transformObject(v)]))
}

function unpackToString(value: Record<string, any>, options: UnpackOptions = {}): string {
  const { entrySeparator = '', keyValueSeparator = '', resolve } = options
  return Object.entries(value).map(([key, val]) => {
    if (resolve) {
      const resolved = resolve({ key, value: val })
      if (resolved !== undefined)
        return resolved
    }

    const processedVal = typeof val === 'object'
      ? unpackToString(val, options)
      : typeof val === 'number'
        ? val.toString()
        : val

    return `${key}${keyValueSeparator}${processedVal}`
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
  return unpackMeta(input || {})
    .sort((a: any, b: any) => ((a[attr]?.length || 0) - (b[attr]?.length || 0)))
}

function metaKeyType(key: string, fixed?: string): MetaKeyType {
  if (HTTP_EQUIV_KEYS.includes(key)) {
    return 'http-equiv'
  }

  fixed ??= fixKeyCase(key)
  const colonIndex = fixed.indexOf(':')
  return colonIndex === -1
    ? 'name'
    : PROPERTY_NAMESPACES.includes(fixed.slice(0, colonIndex))
      ? 'property'
      : 'name'
}

export function resolveMetaKeyType(key: string): MetaKeyType {
  return metaKeyType(key)
}

export function resolveMetaKeyValue(key: string): string {
  return resolveAlias(key, fixKeyCase(key))
}

export function resolvePackedMetaObjectValue(value: any, key: string): string {
  if (key === 'refresh')
    return `${value.seconds};url=${value.url}`

  return unpackToString(transformObject(value), {
    keyValueSeparator: '=',
    entrySeparator: ', ',
    resolve: ({ value, key }) => value === null ? '' : (typeof value === 'boolean' ? key : undefined),
    ...MetaPackingUnpack[key],
  })
}

export function unpackMeta<T extends MetaFlat>(input: T): UnheadMeta[] {
  const meta: UnheadMeta[] = []
  const primitives: Record<string, any> = {}

  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      if (key === 'themeColor') {
        value.forEach((v) => {
          if (typeof v === 'object' && v !== null) {
            meta.push({ name: 'theme-color', ...v })
          }
        })
        continue
      }

      for (const v of value) {
        if (typeof v === 'object' && v !== null) {
          const urlProps: UnheadMeta[] = []
          const otherProps: UnheadMeta[] = []

          for (const [propKey, propValue] of Object.entries(v)) {
            const metaKey = `${key}${propKey === 'url' ? '' : `:${propKey}`}`
            const items = unpackMeta({ [metaKey]: propValue })
            ;(propKey === 'url' ? urlProps : otherProps).push(...items)
          }
          meta.push(...urlProps, ...otherProps)
        }
        else {
          meta.push(...(typeof v === 'string'
            ? unpackMeta({ [key]: v })
            : handleObjectEntry(key, v)))
        }
      }
      continue
    }

    if (typeof value === 'object' && value) {
      if (MEDIA_KEYS.includes(key)) {
        const prefix = key.startsWith('twitter') ? 'twitter' : 'og'
        const type = key.replace(OG_TWITTER_RE, '').toLowerCase()
        const metaKey = prefix === 'twitter' ? 'name' : 'property'

        if (value.url) {
          meta.push({
            [metaKey]: `${prefix}:${type}`,
            content: value.url,
          } as MetaGeneric as UnheadMeta)
        }
        if (value.secureUrl) {
          meta.push({
            [metaKey]: `${prefix}:${type}:secure_url`,
            content: value.secureUrl,
          } as MetaGeneric as UnheadMeta)
        }

        for (const [propKey, propValue] of Object.entries(value)) {
          if (propKey !== 'url' && propKey !== 'secureUrl') {
            meta.push({
              [metaKey]: `${prefix}:${type}:${propKey}`,
              content: propValue,
            } as MetaGeneric as UnheadMeta)
          }
        }
      }
      else if (MetaTagsArrayable.has(fixKeyCase(key) as keyof MetaFlat)) {
        meta.push(...handleObjectEntry(key, value))
      }
      else {
        primitives[key] = sanitizeObject(key === 'robots' ? normalizeRobotsDirectives(value) : value)
      }
    }
    else {
      primitives[key] = value
    }
  }

  for (const [key, value] of Object.entries(primitives)) {
    if (key === 'charset') {
      meta.push({ charset: value === null ? '_null' : value })
      continue
    }

    const fixed = fixKeyCase(key)
    const attr = metaKeyType(key, fixed)
    const keyValue = resolveAlias(key, fixed)
    const processedValue = value === null
      ? null
      : typeof value === 'object'
        ? resolvePackedMetaObjectValue(value, key)
        : typeof value === 'number'
          ? value.toString()
          : value

    meta.push({ [attr]: keyValue, content: processedValue } as MetaGeneric as UnheadMeta)
  }
  return meta
}
