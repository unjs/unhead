import type { BaseBodyAttributes, DataKeys, LinkBase, LinkRelTypes, MaybePromiseProps, Noscript, Stringable, HtmlAttributes as _HtmlAttributes, Meta as _Meta } from 'zhead'
import type {
  HeadUtils,
  MaybeArray,
  SchemaAugmentations,
  Title,
} from './schema'

interface BodyAttr extends Pick<BaseBodyAttributes, 'id'> {
  /**
   * The class global attribute is a space-separated list of the case-sensitive classes of the element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class
   */
  class?: MaybeArray<string> | Record<string, boolean>
}

interface HtmlAttr extends Pick<_HtmlAttributes, 'lang' | 'dir' | 'id'> {
  /**
   * The class global attribute is a space-separated list of the case-sensitive classes of the element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class
   */
  class?: MaybeArray<string> | Record<string, boolean>
}

interface BaseMeta extends Pick<_Meta, 'name' | 'property' | 'id'> {
  /**
   * This attribute contains the value for the http-equiv, name or property attribute, depending on which is used.
   *
   * You can provide an array of values to create multiple tags sharing the same name, property or http-equiv.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#attr-content
   */
  content?: MaybeArray<Stringable>
}

export type SafeMeta = MaybePromiseProps<BaseMeta> & DataKeys & SchemaAugmentations['meta']
export type SafeHtmlAttributes = MaybePromiseProps<HtmlAttr> & DataKeys & SchemaAugmentations['htmlAttrs']
export type SafeBodyAttributes = MaybePromiseProps<BodyAttr> & DataKeys & SchemaAugmentations['bodyAttrs']

export interface HeadSafe extends HeadUtils {
  /**
   * The <title> HTML element defines the document's title that is shown in a browser's title bar or a page's tab.
   * It only contains text; tags within the element are ignored.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/title
   */
  title?: Title | Promise<Title>
  /**
   * The <meta> element represents metadata that cannot be expressed in other HTML elements, like <link> or <script>.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta
   */
  meta?: SafeMeta[]
  link?: Pick<LinkBase,
    'color' | 'crossorigin' | 'fetchpriority' | 'href' | 'hreflang' | 'imagesizes' | 'imagesrcset' | 'integrity' | 'media'
    | 'referrerpolicy' | 'sizes' | 'id'
  > & {
    /**
     * This attribute names a relationship of the linked document to the current document.
     * The attribute must be a space-separated list of link type values.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-rel
     */
    rel?: Omit<LinkRelTypes, 'stylesheet' | 'canonical' | 'modulepreload' | 'prerender' | 'preload' | 'prefetch'>
    /**
     * This attribute is used to define the type of the content linked to.
     * The value of the attribute should be a MIME type such as text/html, text/css, and so on.
     * The common use of this attribute is to define the type of stylesheet being referenced (such as text/css),
     * but given that CSS is the only stylesheet language used on the web,
     * not only is it possible to omit the type attribute, but is actually now recommended practice.
     * It is also used on rel="preload" link types, to make sure the browser only downloads file types that it supports.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-type
     */
    type?: 'audio/aac' | 'application/x-abiword' | 'application/x-freearc' | 'image/avif' | 'video/x-msvideo' | 'application/vnd.amazon.ebook' | 'application/octet-stream' | 'image/bmp' | 'application/x-bzip' | 'application/x-bzip2' | 'application/x-cdf' | 'application/x-csh' | 'text/csv' | 'application/msword' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' | 'application/vnd.ms-fontobject' | 'application/epub+zip' | 'application/gzip' | 'image/gif' | 'image/vnd.microsoft.icon' | 'text/calendar' | 'application/java-archive' | 'image/jpeg' | 'application/json' | 'application/ld+json' | 'audio/midi' | 'audio/x-midi' | 'audio/mpeg' | 'video/mp4' | 'video/mpeg' | 'application/vnd.apple.installer+xml' | 'application/vnd.oasis.opendocument.presentation' | 'application/vnd.oasis.opendocument.spreadsheet' | 'application/vnd.oasis.opendocument.text' | 'audio/ogg' | 'video/ogg' | 'application/ogg' | 'audio/opus' | 'font/otf' | 'image/png' | 'application/pdf' | 'application/x-httpd-php' | 'application/vnd.ms-powerpoint' | 'application/vnd.openxmlformats-officedocument.presentationml.presentation' | 'application/vnd.rar' | 'application/rtf' | 'application/x-sh' | 'image/svg+xml' | 'application/x-tar' | 'image/tiff' | 'video/mp2t' | 'font/ttf' | 'text/plain' | 'application/vnd.visio' | 'audio/wav' | 'audio/webm' | 'video/webm' | 'image/webp' | 'font/woff' | 'font/woff2' | 'application/xhtml+xml' | 'application/vnd.ms-excel' | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' | 'text/xml' | 'application/atom+xml' | 'application/xml' | 'application/vnd.mozilla.xul+xml' | 'application/zip' | 'video/3gpp' | 'audio/3gpp' | 'video/3gpp2' | 'audio/3gpp2' | (string & Record<never, never>)
  }[]
  noscript?: { textContent: string } & Pick<Noscript, 'id'>[]
  script?: { type: 'application/json' | 'application/ld+json'; textContent: string | Record<string, string> }[]
  /**
   * Attributes for the <html> HTML element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/html
   */
  htmlAttrs?: SafeHtmlAttributes
  /**
   * Attributes for the <body> HTML element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body
   */
  bodyAttrs?: SafeBodyAttributes
}
