import type {
  BaseMeta,
  BodyAttributes,
  DataKeys,
  HtmlAttributes,
  LinkBase,
  Noscript,
  ResolvableHead,
  SchemaAugmentations,
  ScriptBase,
  Style,
} from './schema'
import type { ResolvableProperties, ResolvableValue } from './util'

export type SafeBodyAttr = ResolvableProperties<Pick<BodyAttributes, 'id' | 'class' | 'style'> & DataKeys & SchemaAugmentations['bodyAttrs']>
export type SafeHtmlAttr = ResolvableProperties<Pick<HtmlAttributes, 'id' | 'class' | 'style' | 'lang' | 'dir'> & DataKeys & SchemaAugmentations['htmlAttrs']>
export type SafeMeta = ResolvableProperties<Pick<BaseMeta, 'id' | 'name' | 'property' | 'charset' | 'content' | 'media'> & DataKeys & SchemaAugmentations['meta']>
export type SafeLink = ResolvableProperties<Pick<LinkBase, 'id' | 'color' | 'crossorigin' | 'fetchpriority' | 'href' | 'hreflang' | 'imagesrcset' | 'imagesizes' | 'integrity' | 'media' | 'referrerpolicy' | 'rel' | 'sizes' | 'type'> & DataKeys & SchemaAugmentations['link']>
export type SafeScript = ResolvableProperties<Pick<ScriptBase, 'id' | 'type' | 'nonce' | 'blocking'> & DataKeys & SchemaAugmentations['script']>
export type SafeNoscript = ResolvableProperties<Pick<Noscript, 'id' | 'textContent'> & DataKeys & SchemaAugmentations['noscript']>
export type SafeStyle = ResolvableProperties<Pick<Style, 'id' | 'media' | 'textContent' | 'nonce' | 'title' | 'blocking'> & DataKeys & SchemaAugmentations['style']>

export interface HeadSafe extends Pick<ResolvableHead, 'title' | 'titleTemplate' | 'templateParams'> {
  /**
   * The `<link>` HTML element specifies relationships between the current document and an external resource.
   * This element is most commonly used to link to stylesheets, but is also used to establish site icons
   * (both "favicon" style icons and icons for the home screen and apps on mobile devices) among other things.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-as
   */
  link?: ResolvableValue<ResolvableValue<SafeLink[]>>
  /**
   * The `<meta>` element represents metadata that cannot be expressed in other HTML elements, like `<link>` or `<script>`.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta
   */
  meta?: ResolvableValue<ResolvableValue<SafeMeta>[]>
  /**
   * The `<style>` HTML element contains style information for a document, or part of a document.
   * It contains CSS, which is applied to the contents of the document containing the `<style>` element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/style
   */
  style?: ResolvableValue<ResolvableValue<(SafeStyle | string)>[]>
  /**
   * The `<script>` HTML element is used to embed executable code or data; this is typically used to embed or refer to JavaScript code.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script
   */
  script?: ResolvableValue<ResolvableValue<(SafeScript | string)>[]>
  /**
   * The `<noscript>` HTML element defines a section of HTML to be inserted if a script type on the page is unsupported
   * or if scripting is currently turned off in the browser.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/noscript
   */
  noscript?: ResolvableValue<ResolvableValue<(SafeNoscript | string)>[]>
  /**
   * Attributes for the `<html>` HTML element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/html
   */
  htmlAttrs?: ResolvableValue<SafeHtmlAttr>
  /**
   * Attributes for the `<body>` HTML element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body
   */
  bodyAttrs?: ResolvableValue<SafeBodyAttr>
}
