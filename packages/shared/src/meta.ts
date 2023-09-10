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
  appleItunesApp: {
    unpack: {
      entrySeparator: ', ',
      resolve({ key, value }) {
        return `${fixKeyCase(key)}=${value}`
      },
    },
  },
  articleAuthor: {
    keyValue: 'article:author',
    metaKey: 'property',
  },
  articleExpirationTime: {
    keyValue: 'article:expiration_time',
    metaKey: 'property',
  },
  articleModifiedTime: {
    keyValue: 'article:modified_time',
    metaKey: 'property',
  },
  articlePublishedTime: {
    keyValue: 'article:published_time',
    metaKey: 'property',
  },
  articleSection: {
    keyValue: 'article:section',
    metaKey: 'property',
  },
  articleTag: {
    keyValue: 'article:tag',
    metaKey: 'property',
  },
  bookAuthor: {
    keyValue: 'book:author',
    metaKey: 'property',
  },
  bookIsbn: {
    keyValue: 'book:isbn',
    metaKey: 'property',
  },
  bookReleaseDate: {
    keyValue: 'book:release_date',
    metaKey: 'property',
  },
  bookTag: {
    keyValue: 'book:tag',
    metaKey: 'property',
  },
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
  fbAppId: {
    keyValue: 'fb:app_id',
    metaKey: 'property',
  },
  msapplicationConfig: {
    keyValue: 'msapplication-Config',
  },
  msapplicationTileColor: {
    keyValue: 'msapplication-TileColor',
  },
  msapplicationTileImage: {
    keyValue: 'msapplication-TileImage',
  },
  ogAudioSecureUrl: {
    keyValue: 'og:audio:secure_url',
    metaKey: 'property',
  },
  ogAudioType: {
    keyValue: 'og:audio:type',
    metaKey: 'property',
  },
  ogAudioUrl: {
    keyValue: 'og:audio',
    metaKey: 'property',
  },
  ogDescription: {
    keyValue: 'og:description',
    metaKey: 'property',
  },
  ogDeterminer: {
    keyValue: 'og:determiner',
    metaKey: 'property',
  },
  ogImage: {
    keyValue: 'og:image',
    metaKey: 'property',
  },
  ogImageAlt: {
    keyValue: 'og:image:alt',
    metaKey: 'property',
  },
  ogImageHeight: {
    keyValue: 'og:image:height',
    metaKey: 'property',
  },
  ogImageSecureUrl: {
    keyValue: 'og:image:secure_url',
    metaKey: 'property',
  },
  ogImageType: {
    keyValue: 'og:image:type',
    metaKey: 'property',
  },
  ogImageUrl: {
    keyValue: 'og:image',
    metaKey: 'property',
  },
  ogImageWidth: {
    keyValue: 'og:image:width',
    metaKey: 'property',
  },
  ogLocale: {
    keyValue: 'og:locale',
    metaKey: 'property',
  },
  ogLocaleAlternate: {
    keyValue: 'og:locale:alternate',
    metaKey: 'property',
  },
  ogSiteName: {
    keyValue: 'og:site_name',
    metaKey: 'property',
  },
  ogTitle: {
    keyValue: 'og:title',
    metaKey: 'property',
  },
  ogType: {
    keyValue: 'og:type',
    metaKey: 'property',
  },
  ogUrl: {
    keyValue: 'og:url',
    metaKey: 'property',
  },
  ogVideo: {
    keyValue: 'og:video',
    metaKey: 'property',
  },
  ogVideoAlt: {
    keyValue: 'og:video:alt',
    metaKey: 'property',
  },
  ogVideoHeight: {
    keyValue: 'og:video:height',
    metaKey: 'property',
  },
  ogVideoSecureUrl: {
    keyValue: 'og:video:secure_url',
    metaKey: 'property',
  },
  ogVideoType: {
    keyValue: 'og:video:type',
    metaKey: 'property',
  },
  ogVideoUrl: {
    keyValue: 'og:video',
    metaKey: 'property',
  },
  ogVideoWidth: {
    keyValue: 'og:video:width',
    metaKey: 'property',
  },
  profileFirstName: {
    keyValue: 'profile:first_name',
    metaKey: 'property',
  },
  profileGender: {
    keyValue: 'profile:gender',
    metaKey: 'property',
  },
  profileLastName: {
    keyValue: 'profile:last_name',
    metaKey: 'property',
  },
  profileUsername: {
    keyValue: 'profile:username',
    metaKey: 'property',
  },
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
  twitterAppIdGoogleplay: {
    keyValue: 'twitter:app:id:googleplay',
  },
  twitterAppIdIpad: {
    keyValue: 'twitter:app:id:ipad',
  },
  twitterAppIdIphone: {
    keyValue: 'twitter:app:id:iphone',
  },
  twitterAppNameGoogleplay: {
    keyValue: 'twitter:app:name:googleplay',
  },
  twitterAppNameIpad: {
    keyValue: 'twitter:app:name:ipad',
  },
  twitterAppNameIphone: {
    keyValue: 'twitter:app:name:iphone',
  },
  twitterAppUrlGoogleplay: {
    keyValue: 'twitter:app:url:googleplay',
  },
  twitterAppUrlIpad: {
    keyValue: 'twitter:app:url:ipad',
  },
  twitterAppUrlIphone: {
    keyValue: 'twitter:app:url:iphone',
  },
  twitterCard: {
    keyValue: 'twitter:card',
  },
  twitterCreator: {
    keyValue: 'twitter:creator',
  },
  twitterCreatorId: {
    keyValue: 'twitter:creator:id',
  },
  twitterData1: {
    keyValue: 'twitter:data1',
  },
  twitterData2: {
    keyValue: 'twitter:data2',
  },
  twitterDescription: {
    keyValue: 'twitter:description',
  },
  twitterImage: {
    keyValue: 'twitter:image',
  },
  twitterImageAlt: {
    keyValue: 'twitter:image:alt',
  },
  /*************************************************/
  // not part of Twitter's card specification anymore
  twitterImageHeight: {
    keyValue: 'twitter:image:height',
  },
  twitterImageType: {
    keyValue: 'twitter:image:type',
  },
  twitterImageUrl: {
    keyValue: 'twitter:image',
  },
  twitterImageWidth: {
    keyValue: 'twitter:image:width',
  },
  /**************************************************/
  twitterLabel1: {
    keyValue: 'twitter:label1',
  },
  twitterLabel2: {
    keyValue: 'twitter:label2',
  },
  twitterPlayer: {
    keyValue: 'twitter:player',
  },
  twitterPlayerHeight: {
    keyValue: 'twitter:player:height',
  },
  twitterPlayerStream: {
    keyValue: 'twitter:player:stream',
  },
  twitterPlayerWidth: {
    keyValue: 'twitter:player:width',
  },
  twitterSite: {
    keyValue: 'twitter:site',
  },
  twitterSiteId: {
    keyValue: 'twitter:site:id',
  },
  twitterTitle: {
    keyValue: 'twitter:title',
  },
  xUaCompatible: {
    metaKey: 'http-equiv',
  },
} as const

export function resolveMetaKeyType(key: string): string {
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

function getMeta(key: string, value: string) {
  const meta: Record<string, string> = {}
  const metaKeyType = resolveMetaKeyType(key)

  if (metaKeyType === 'charset') {
    meta[metaKeyType] = value
  }
  else {
    meta[metaKeyType] = resolveMetaKeyValue(key)
    meta.content = value
  }

  return meta
}

function flattenMetaObjects(input: Record<string, any>, prefix: string = '') {
  const extras: Record<string, any>[] = []

  for (const [key, value] of Object.entries(input)) {
    const fullkey = `${prefix}${prefix === '' ? key : key.charAt(0).toUpperCase() + key.slice(1)}`
    const unpacker = MetaPackingSchema[key]?.unpack

    if (unpacker) {
      extras.push(getMeta(fullkey, unpackToString(value, unpacker)))
      delete input[key]
      continue
    }

    if (typeof value === 'object') {
      const children = Array.isArray(value) ? value : [value]

      for (const child of children) {
        if (typeof child === 'object')
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
  const extras: Record<string, string>[] = []

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
