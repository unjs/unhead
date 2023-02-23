import type {
  BodyAttr,
  DataKeys,
  Head,
  HtmlAttr,
  Link,
  Noscript,
  Script,
  Meta as _Meta,
} from './schema'

export type SafeBodyAttr = Pick<BodyAttr, 'id' | 'class'> & DataKeys
export type SafeHtmlAttr = Pick<HtmlAttr, 'id' | 'class' | 'lang' | 'dir'> & DataKeys
export type SafeMeta = Pick<_Meta, 'id' | 'name' | 'property' | 'content'> & DataKeys
export type SafeLink = Pick<Link,
  'color' | 'crossorigin' | 'fetchpriority' | 'href' | 'hreflang' | 'imagesizes' | 'imagesrcset' | 'integrity' | 'media'
  | 'referrerpolicy' | 'sizes' | 'id'
> & {
  rel?: Omit<Link['rel'], 'stylesheet' | 'canonical' | 'modulepreload' | 'prerender' | 'preload' | 'prefetch'>
  type?: 'audio/aac' | 'application/x-abiword' | 'application/x-freearc' | 'image/avif' | 'video/x-msvideo' | 'application/vnd.amazon.ebook' | 'application/octet-stream' | 'image/bmp' | 'application/x-bzip' | 'application/x-bzip2' | 'application/x-cdf' | 'application/x-csh' | 'text/csv' | 'application/msword' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' | 'application/vnd.ms-fontobject' | 'application/epub+zip' | 'application/gzip' | 'image/gif' | 'image/vnd.microsoft.icon' | 'text/calendar' | 'application/java-archive' | 'image/jpeg' | 'application/json' | 'application/ld+json' | 'audio/midi' | 'audio/x-midi' | 'audio/mpeg' | 'video/mp4' | 'video/mpeg' | 'application/vnd.apple.installer+xml' | 'application/vnd.oasis.opendocument.presentation' | 'application/vnd.oasis.opendocument.spreadsheet' | 'application/vnd.oasis.opendocument.text' | 'audio/ogg' | 'video/ogg' | 'application/ogg' | 'audio/opus' | 'font/otf' | 'image/png' | 'application/pdf' | 'application/x-httpd-php' | 'application/vnd.ms-powerpoint' | 'application/vnd.openxmlformats-officedocument.presentationml.presentation' | 'application/vnd.rar' | 'application/rtf' | 'application/x-sh' | 'image/svg+xml' | 'application/x-tar' | 'image/tiff' | 'video/mp2t' | 'font/ttf' | 'text/plain' | 'application/vnd.visio' | 'audio/wav' | 'audio/webm' | 'video/webm' | 'image/webp' | 'font/woff' | 'font/woff2' | 'application/xhtml+xml' | 'application/vnd.ms-excel' | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' | 'text/xml' | 'application/atom+xml' | 'application/xml' | 'application/vnd.mozilla.xul+xml' | 'application/zip' | 'video/3gpp' | 'audio/3gpp' | 'video/3gpp2' | 'audio/3gpp2' | (string & Record<never, never>)
} & DataKeys
export type SafeScript = Pick<Script, 'id' | 'textContent'> & { type: 'application/json' | 'application/ld+json' } & DataKeys
export type SafeNoscript = Pick<Noscript, 'id' | 'textContent'> & DataKeys

export interface HeadSafe extends Pick<Head, 'title' | 'titleTemplate' | 'templateParams'> {
  meta?: SafeMeta[]
  link?: SafeLink[]
  noscript?: SafeNoscript[]
  script?: SafeScript[]
  htmlAttrs?: SafeHtmlAttr
  bodyAttrs?: SafeBodyAttr
}
