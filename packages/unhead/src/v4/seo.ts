/** @experimental v4 preview surface: semver-exempt until v4 stabilizes. See packages/unhead/V4_DESIGN.md. */
/**
 * v4 L2: useSeoMeta. The flat-meta expander lives at the call site (no plugin),
 * compiles flat input into a regular head object and pushes through L1.
 * Port of v3 utils/meta.ts (unpackMeta + META_ALIASES + MetaPackingSchema),
 * trimmed to the public useSeoMeta contract.
 */
import type { UseSeoMetaInput } from '../types'
import type { EntryOptions, V4Head } from './core'

type Meta = Record<string, any>

const META_NS = /* @__PURE__ */ new Set(['twitter', 'fediverse'])
const OG_NS = /* @__PURE__ */ new Set(['og', 'book', 'article', 'profile', 'fb', 'payment'])
const MEDIA_KEYS = /* @__PURE__ */ new Set(['ogImage', 'ogVideo', 'ogAudio', 'twitterImage'])
const HTTP_EQUIV_KEYS = /* @__PURE__ */ new Set(['contentType', 'defaultStyle', 'xUaCompatible'])
const ARRAYABLE = /* @__PURE__ */ new Set(['theme-color', 'google-site-verification', 'author', 'og:locale:alternate', 'og:image', 'og:video', 'og:audio', 'article:author', 'article:tag', 'book:author', 'book:tag', 'twitter:image'])

const ALIASES: Record<string, string> = /* @__PURE__ */ {
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
  paymentExpiresAt: 'payment:expires_at',
  paymentSuccessUrl: 'payment:success_url',
  profileFirstName: 'profile:first_name',
  profileLastName: 'profile:last_name',
  profileUsername: 'profile:username',
  msapplicationConfig: 'msapplication-Config',
  msapplicationTileColor: 'msapplication-TileColor',
  msapplicationTileImage: 'msapplication-TileImage',
}

const CAPS_RE = /([A-Z])/g
const OG_TWITTER_RE = /^(?:og|twitter)/

interface UnpackOptions {
  entrySeparator?: string
  keyValueSeparator?: string
  resolve?: (ctx: { key: string, value: any }) => string | undefined
}

// MetaPackingSchema: packed-object meta values (robots, refresh, csp, apple-itunes-app)
const PACKING: Record<string, { metaKey?: 'http-equiv', unpack?: UnpackOptions }> = /* @__PURE__ */ {
  appleItunesApp: {
    unpack: { entrySeparator: ', ', resolve: ({ key, value }) => `${fixKeyCase(key)}=${value}` },
  },
  refresh: {
    metaKey: 'http-equiv',
    unpack: { entrySeparator: ';', resolve: ({ key, value }) => key === 'seconds' ? `${value}` : undefined },
  },
  robots: {
    unpack: { entrySeparator: ', ', resolve: ({ key, value }) => typeof value === 'boolean' ? fixKeyCase(key) : `${fixKeyCase(key)}:${value}` },
  },
  contentSecurityPolicy: {
    metaKey: 'http-equiv',
    unpack: { entrySeparator: '; ', resolve: ({ key, value }) => `${fixKeyCase(key)} ${value}` },
  },
  charset: {},
}

function fixKeyCase(key: string): string {
  const updated = key.replace(CAPS_RE, '-$1').toLowerCase()
  const prefixIndex = updated.indexOf('-')
  return prefixIndex === -1
    ? updated
    : (META_NS.has(updated.slice(0, prefixIndex)) || OG_NS.has(updated.slice(0, prefixIndex))
        ? key.replace(CAPS_RE, ':$1').toLowerCase()
        : updated)
}

// drop `false` values from packed objects (robots: { nosnippet: false })
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

function unpackToString(value: Record<string, any>, options: UnpackOptions): string {
  const { entrySeparator = '', keyValueSeparator = '', resolve } = options
  return Object.entries(value).map(([key, val]) => {
    if (resolve) {
      const resolved = resolve({ key, value: val })
      if (resolved !== undefined)
        return resolved
    }
    const processed = typeof val === 'object'
      ? unpackToString(val, options)
      : typeof val === 'number' ? val.toString() : val
    return `${key}${keyValueSeparator}${processed}`
  }).join(entrySeparator)
}

function resolveMetaKeyType(key: string): 'name' | 'property' | 'http-equiv' {
  if (PACKING[key]?.metaKey === 'http-equiv' || HTTP_EQUIV_KEYS.has(key))
    return 'http-equiv'
  const fixed = fixKeyCase(key)
  const colonIndex = fixed.indexOf(':')
  return colonIndex === -1
    ? 'name'
    : OG_NS.has(fixed.slice(0, colonIndex)) ? 'property' : 'name'
}

const resolveMetaKeyValue = (key: string): string => ALIASES[key] || fixKeyCase(key)

function resolvePackedMetaObjectValue(value: any, key: string): string {
  if (key === 'refresh')
    return `${value.seconds};url=${value.url}`
  return unpackToString(transformObject(value), {
    keyValueSeparator: '=',
    entrySeparator: ', ',
    resolve: ({ value, key }) => value === null ? '' : (typeof value === 'boolean' ? key : undefined),
    ...PACKING[key]?.unpack,
  })
}

// arrayable non-media object (e.g. themeColor entries handled separately): expand
// prefixed keys back through unpackMeta so nested props resolve their own attribution
function handleObjectEntry(key: string, value: Record<string, any>): Meta[] {
  const sanitizedValue = sanitizeObject(value)
  const fixedKey = fixKeyCase(key)
  const attr = resolveMetaKeyType(fixedKey)
  if (!ARRAYABLE.has(fixedKey))
    return [{ [attr]: fixedKey, ...sanitizedValue }]
  const input = Object.fromEntries(
    Object.entries(sanitizedValue).map(([k, v]) => [`${key}${k === 'url' ? '' : `${k[0].toUpperCase()}${k.slice(1)}`}`, v]),
  )
  return unpackMeta(input).sort((a: any, b: any) => ((a[attr]?.length || 0) - (b[attr]?.length || 0)))
}

/** Expand flat meta input (ogTitle, robots objects, ogImage arrays...) into meta tag objects. */
export function unpackMeta(input: Meta): Meta[] {
  const extras: Meta[] = []
  const primitives: Record<string, any> = {}

  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      if (key === 'themeColor') {
        for (const v of value) {
          if (typeof v === 'object' && v !== null)
            extras.push({ name: 'theme-color', ...v })
        }
        continue
      }
      for (const v of value) {
        if (typeof v === 'object' && v !== null) {
          // media object arrays: url props emit before the rest (og:image before og:image:width)
          const urlProps: Meta[] = []
          const otherProps: Meta[] = []
          for (const [propKey, propValue] of Object.entries(v)) {
            const metaKey = `${key}${propKey === 'url' ? '' : `:${propKey}`}`
            const meta = unpackMeta({ [metaKey]: propValue })
            ;(propKey === 'url' ? urlProps : otherProps).push(...meta)
          }
          extras.push(...urlProps, ...otherProps)
        }
        else {
          extras.push(...(typeof v === 'string' ? unpackMeta({ [key]: v }) : handleObjectEntry(key, v)))
        }
      }
      continue
    }

    if (typeof value === 'object' && value) {
      if (MEDIA_KEYS.has(key)) {
        const prefix = key.startsWith('twitter') ? 'twitter' : 'og'
        const type = key.replace(OG_TWITTER_RE, '').toLowerCase()
        const metaKey = prefix === 'twitter' ? 'name' : 'property'
        if (value.url)
          extras.push({ [metaKey]: `${prefix}:${type}`, content: value.url })
        if (value.secureUrl)
          extras.push({ [metaKey]: `${prefix}:${type}:secure_url`, content: value.secureUrl })
        for (const [propKey, propValue] of Object.entries(value)) {
          if (propKey !== 'url' && propKey !== 'secureUrl')
            extras.push({ [metaKey]: `${prefix}:${type}:${propKey}`, content: propValue })
        }
      }
      else if (ARRAYABLE.has(fixKeyCase(key))) {
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

  const meta = Object.entries(primitives).map(([key, value]): Meta => {
    if (key === 'charset')
      return { charset: value === null ? '_null' : value }
    const metaKey = resolveMetaKeyType(key)
    const keyValue = resolveMetaKeyValue(key)
    const processedValue = value === null
      ? '_null'
      : typeof value === 'object'
        ? resolvePackedMetaObjectValue(value, key)
        : typeof value === 'number' ? value.toString() : value
    return { [metaKey]: keyValue, content: processedValue }
  })

  return [...extras, ...meta].map(m =>
    !('content' in m) ? m : m.content === '_null' ? { ...m, content: null } : m,
  )
}

/** Compile flat seo-meta input into a regular head object ({ title, titleTemplate, meta }). */
export function unpackSeoMetaInput(input: Meta): Record<string, any> {
  const out: Record<string, any> = {}
  const flat: Meta = {}
  for (const key in input) {
    if (key === 'title' || key === 'titleTemplate')
      out[key] = input[key]
    else if (input[key] !== undefined)
      flat[key] = input[key]
  }
  out.meta = unpackMeta(flat)
  return out
}

export function useSeoMeta(head: V4Head, input: UseSeoMetaInput = {}, opts?: EntryOptions) {
  const entry = head.push(unpackSeoMetaInput(input as Meta), opts)
  const patch = entry.patch
  // patch renormalizes: flat input in, expanded head object down to the core
  entry.patch = (next, fills) => patch(unpackSeoMetaInput((next || {}) as Meta), fills)
  return entry
}
