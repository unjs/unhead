import type { HttpEventAttributes } from './attributes/event'
import type { GlobalAttributes } from './attributes/global'
import type { ReferrerPolicy } from './shared'
import type { Blocking } from './struct/blocking'

export type LinkRelTypes = 'alternate' |
  'author' |
  'shortcut icon' |
  'bookmark' |
  'canonical' |
  'dns-prefetch' |
  'external' |
  'help' |
  'icon' |
  'license' |
  'manifest' |
  'mask-icon' |
  'me' |
  'modulepreload' |
  'next' |
  'nofollow' |
  'noopener' |
  'noreferrer' |
  'opener' |
  'pingback' |
  'preconnect' |
  'prefetch' |
  'preload' |
  'prerender' |
  'prev' |
  'search' |
  'shortlink' |
  'stylesheet' |
  'tag' |
  'apple-touch-icon' |
  'apple-touch-startup-image'

export interface BaseLinkAttributes extends Pick<GlobalAttributes, 'nonce' | 'id'>, Blocking {
  crossorigin?: '' | 'anonymous' | 'use-credentials'
  fetchpriority?: 'high' | 'low' | 'auto'
  hreflang?: string
  importance?: 'high' | 'low' | 'auto'
  integrity?: string
  media?: string
  referrerpolicy?: ReferrerPolicy
  title?: string
  type?: string
}

// For simple href-required links without special attributes
export interface HrefRequiredLink extends BaseLinkAttributes {
  rel: 'canonical' | 'author' | 'bookmark' | 'help' | 'license' |
    'next' | 'prev' | 'shortlink'
  href: string
}

// For preload, prefetch and modulepreload which require both href and as
export interface PreloadLink extends BaseLinkAttributes {
  rel: 'preload' | 'modulepreload' | 'prefetch'
  href: string
  as: 'audio' | 'document' | 'embed' | 'fetch' | 'image' |
    'object' | 'script' | 'style' | 'track' | 'video' | 'worker'
  imagesrcset?: string
  imagesizes?: string
}

// For image preloads which can have additional image-specific attributes
export interface ImagePreloadLink extends Omit<PreloadLink, 'as'> {
  rel: 'preload' | 'modulepreload' | 'prefetch'
  as: 'image'
  imagesrcset?: string
  imagesizes?: string
}

// For font preloading which requires crossorigin
export interface FontPreloadLink extends Omit<PreloadLink, 'as' | 'crossorigin'> {
  rel: 'preload' | 'prefetch'
  as: 'font'
  href: string
  crossorigin: '' | 'anonymous' | 'use-credentials'
}

// For icon links that need sizes
export interface IconLink extends BaseLinkAttributes {
  rel: 'icon' | 'shortcut icon' | 'apple-touch-icon'
  href: string
  sizes?: string
  type?: 'image/png' | 'image/svg+xml' | 'image/x-icon' | 'image/webp' | 'image/jpeg' | string
}

// For mask-icon which needs color
export interface MaskIconLink extends BaseLinkAttributes {
  rel: 'mask-icon'
  href: string
  color?: string
}

// For dns-prefetch, preconnect where href is optional
export interface OptionalHrefLink extends BaseLinkAttributes {
  rel: 'dns-prefetch' | 'preconnect' | 'prerender'
  href?: string
}

// For search links (OpenSearch description)
export interface SearchLink extends BaseLinkAttributes {
  rel: 'search'
  href: string
  type: 'application/opensearchdescription+xml' | string
  title?: string
}

// For pingback links
export interface PingbackLink extends BaseLinkAttributes {
  rel: 'pingback'
  href: string
}

// For stylesheet links
export interface StylesheetLink extends BaseLinkAttributes {
  rel: 'stylesheet'
  href: string
  type?: 'text/css' | string
  media?: string
  disabled?: boolean
  title?: string
}

// For alternate links that often need hreflang
export interface AlternateLink extends BaseLinkAttributes {
  rel: 'alternate'
  href: string
  hreflang?: string
  type?: 'application/rss+xml' | 'application/atom+xml' | 'application/json' | string
  media?: string
}

// For manifest links
export interface ManifestLink extends BaseLinkAttributes {
  rel: 'manifest'
  href: string
  type?: 'application/manifest+json' | string
}

// For apple-touch-startup-image
export interface AppleTouchStartupImageLink extends BaseLinkAttributes {
  rel: 'apple-touch-startup-image'
  href: string
  media?: string
}

// For other rel types
export interface OtherRelLink extends BaseLinkAttributes {
  rel: Exclude<
    LinkRelTypes,
    'canonical' | 'stylesheet' | 'alternate' | 'icon' | 'shortcut icon' |
    'preload' | 'modulepreload' | 'prefetch' | 'dns-prefetch' | 'preconnect' | 'prerender' |
    'author' | 'bookmark' | 'help' | 'license' | 'next' | 'prev' | 'search' |
    'apple-touch-icon' | 'apple-touch-startup-image' | 'shortlink' | 'manifest' | 'mask-icon' |
    'pingback'
  > | (string & Record<never, never>)
  href?: string
}

// Union of all link types
export type LinkWithoutEvents = HrefRequiredLink | PreloadLink | ImagePreloadLink | FontPreloadLink |
  IconLink | OptionalHrefLink | StylesheetLink | AlternateLink | ManifestLink |
  AppleTouchStartupImageLink | MaskIconLink | SearchLink | PingbackLink | OtherRelLink

export type Link = LinkWithoutEvents & HttpEventAttributes
