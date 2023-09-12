import { packArray, unpackToArray, unpackToString } from 'packrup'
import type { TransformValueOptions } from 'packrup'
import type { BaseMeta, Head, MetaFlatInput } from '@unhead/schema'

interface PackingDefinition {
  metaKey?: keyof BaseMeta
  keyValue?: string
  unpack?: TransformValueOptions
}

const p = (p: string) => ({ keyValue: p, metaKey: 'property' }) as PackingDefinition
const k = (p: string) => ({ keyValue: p }) as PackingDefinition

const MetaPackingSchema: Record<string, PackingDefinition> = {
  appleItunesApp: {
    unpack: {
      entrySeparator: ', ',
      resolve({ key, value }) {
        return `${fixKeyCase(key)}=${value}`
      },
    },
  },
  articleAuthor: p('article:author'),
  articleExpirationTime: p('article:expiration_time'),
  articleModifiedTime: p('article:modified_time'),
  articlePublishedTime: p('article:published_time'),
  articleSection: p('article:section'),
  articleTag: p('article:tag'),
  bookAuthor: p('book:author'),
  bookIsbn: p('book:isbn'),
  bookReleaseDate: p('book:release_date'),
  bookTag: p('book:tag'),
  charset: {
    metaKey: 'charset',
  },
  contentSecurityPolicy: {
    unpack: {
      entrySeparator: '; ',
      resolve({ key, value }) {
        return `${fixKeyCase(key)} ${value}`
      },
    },
    metaKey: 'http-equiv',
  },
  contentType: {
    metaKey: 'http-equiv',
  },
  defaultStyle: {
    metaKey: 'http-equiv',
  },
  fbAppId: p('fb:app_id'),
  msapplicationConfig: k('msapplication-Config'),
  msapplicationTileColor: k('msapplication-TileColor'),
  msapplicationTileImage: k('msapplication-TileImage'),
  ogAudioSecureUrl: p('og:audio:secure_url'),
  ogAudioType: p('og:audio:type'),
  ogAudioUrl: p('og:audio'),
  ogDescription: p('og:description'),
  ogDeterminer: p('og:determiner'),
  ogImage: p('og:image'),
  ogImageAlt: p('og:image:alt'),
  ogImageHeight: p('og:image:height'),
  ogImageSecureUrl: p('og:image:secure_url'),
  ogImageType: p('og:image:type'),
  ogImageUrl: p('og:image'),
  ogImageWidth: p('og:image:width'),
  ogLocale: p('og:locale'),
  ogLocaleAlternate: p('og:locale:alternate'),
  ogSiteName: p('og:site_name'),
  ogTitle: p('og:title'),
  ogType: p('og:type'),
  ogUrl: p('og:url'),
  ogVideo: p('og:video'),
  ogVideoAlt: p('og:video:alt'),
  ogVideoHeight: p('og:video:height'),
  ogVideoSecureUrl: p('og:video:secure_url'),
  ogVideoType: p('og:video:type'),
  ogVideoUrl: p('og:video'),
  ogVideoWidth: p('og:video:width'),
  profileFirstName: p('profile:first_name'),
  profileGender: p('profile:gender'),
  profileLastName: p('profile:last_name'),
  profileUsername: p('profile:username'),
  refresh: {
    metaKey: 'http-equiv',
    unpack: {
      entrySeparator: ';',
      keyValueSeparator: '=',
      resolve({ key, value }) {
        if (key === 'seconds')
          return `${value}`
      },
    },
  },
  robots: {
    unpack: {
      entrySeparator: ', ',
      resolve({ key, value }) {
        if (typeof value === 'boolean')
          return `${fixKeyCase(key)}`
        else
          return `${fixKeyCase(key)}:${value}`
      },
    },
  },
  twitterAppIdGoogleplay: k('twitter:app:id:googleplay'),
  twitterAppIdIpad: k('twitter:app:id:ipad'),
  twitterAppIdIphone: k('twitter:app:id:iphone'),
  twitterAppNameGoogleplay: k('twitter:app:name:googleplay'),
  twitterAppNameIpad: k('twitter:app:name:ipad'),
  twitterAppNameIphone: k('twitter:app:name:iphone'),
  twitterAppUrlGoogleplay: k('twitter:app:url:googleplay'),
  twitterAppUrlIpad: k('twitter:app:url:ipad'),
  twitterAppUrlIphone: k('twitter:app:url:iphone'),
  twitterCard: k('twitter:card'),
  twitterCreator: k('twitter:creator'),
  twitterCreatorId: k('twitter:creator:id'),
  twitterData1: k('twitter:data1'),
  twitterData2: k('twitter:data2'),
  twitterDescription: k('twitter:description'),
  twitterImage: k('twitter:image'),
  twitterImageAlt: k('twitter:image:alt'),
  /*************************************************/
  // not part of Twitter's card specification anymore
  twitterImageHeight: k('twitter:image:height'),
  twitterImageType: k('twitter:image:type'),
  twitterImageUrl: k('twitter:image'),
  twitterImageWidth: k('twitter:image:width'),
  /**************************************************/
  twitterLabel1: k('twitter:label1'),
  twitterLabel2: k('twitter:label2'),
  twitterPlayer: k('twitter:player'),
  twitterPlayerHeight: k('twitter:player:height'),
  twitterPlayerStream: k('twitter:player:stream'),
  twitterPlayerWidth: k('twitter:player:width'),
  twitterSite: k('twitter:site'),
  twitterSiteId: k('twitter:site:id'),
  twitterTitle: k('twitter:title'),
  xUaCompatible: {
    metaKey: 'http-equiv',
  },
} as const

export function resolveMetaKeyType(key: string): keyof BaseMeta {
  return MetaPackingSchema[key]?.metaKey || 'name'
}

export function resolveMetaKeyValue(key: string): string {
  return MetaPackingSchema[key]?.keyValue || fixKeyCase(key)
}

function fixKeyCase(key: string) {
  return key.replace(/([A-Z])/g, '-$1').toLowerCase()
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

const SimpleArrayUnpackMetas: (keyof MetaFlatInput)[] = ['themeColor']

function getMeta(key: string, value?: string) {
  const meta: BaseMeta = {}
  const metaKeyType = resolveMetaKeyType(key)

  if (metaKeyType === 'charset') {
    meta[metaKeyType] = value
  }
  else {
    // @ts-expect-error not sure
    meta[metaKeyType] = resolveMetaKeyValue(key)
    meta.content = value
  }

  return meta
}

function flattenMetaObjects(input: MetaFlatInput, prefix: string = '') {
  const extras: BaseMeta[] = []
  for (const [k, v] of Object.entries(input)) {
    const key = k as keyof MetaFlatInput
    const value = v as MetaFlatInput
    const fullkey = `${prefix}${prefix === '' ? key : key.charAt(0).toUpperCase() + key.slice(1)}`
    const unpacker = MetaPackingSchema[key]?.unpack

    if (unpacker) {
      extras.push(getMeta(fullkey, unpackToString(value as Record<string, any>, unpacker)))
      delete input[key]
      continue
    }

    if (!value) {
      extras.push(getMeta(fullkey, value))
      delete input[key]
      continue
    }

    if (typeof value === 'object') {
      const children = Array.isArray(value) ? value : [value]

      for (const child of children) {
        if (!child)
          extras.push(getMeta(fullkey, child))
        else if (typeof child === 'object')
          extras.push(...flattenMetaObjects(child, fullkey))
        else
          extras.push(getMeta(fullkey, child))
      }

      delete input[key]
    }
    else {
      extras.push(getMeta(fullkey, value))
      if (typeof input === 'object')
        delete input[key]
    }
  }

  return extras
}

/**
 * Converts a flat meta object into an array of meta entries.
 * @param input
 */
export function unpackMeta<T extends MetaFlatInput>(input: T): Required<Head>['meta'] {
  const extras: BaseMeta[] = []

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

  extras.push(
    // need to sort the entry and make sure the `og:image` is first
    ...flattenMetaObjects(input).sort((a, b) => {
      if (a.property?.startsWith('og:image')) {
        if (b.property?.startsWith('og:image'))
          return 0
        else
          return -1
      }

      if (b.property?.startsWith('og:image'))
        return 1

      return 0
    }))

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
  }) as BaseMeta[]
  // remove keys with defined but empty content
  return [...extras, ...meta] as unknown as Required<Head>['meta']
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
