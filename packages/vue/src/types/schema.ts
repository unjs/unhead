import type {
  Base as _Base,
  Noscript as _Noscript,
  Style as _Style,
  TitleTemplate as _TitleTemplate,
  BaseBodyAttr,
  BaseHtmlAttr,
  BaseMeta,
  BodyEvents,
  DataKeys,
  HeadEntryOptions,
  HttpEventAttributes,
  LinkBase,
  MaybeArray,
  MaybeEventFnHandlers,
  MetaFlatInput,
  SchemaAugmentations,
  ScriptBase,
  Stringable,
  Unhead,
} from 'unhead/types'
import type { CSSProperties, Plugin, Ref } from 'vue'
import type { ResolvableArray, ResolvableProperties, ResolvableValue } from './util'

export interface HtmlAttr extends Omit<BaseHtmlAttr, 'class' | 'style'> {
  /**
   * The class global attribute is a space-separated list of the case-sensitive classes of the element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class
   */
  class?: MaybeArray<ResolvableValue<Stringable> | Record<string, ResolvableValue<Stringable>>>
  /**
   * The class global attribute is a space-separated list of the case-sensitive classes of the element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class
   */
  style?: MaybeArray<ResolvableValue<Stringable> | ResolvableProperties<CSSProperties>>
}

export interface BodyAttr extends Omit<BaseBodyAttr, 'class' | 'style'> {
  /**
   * The class global attribute is a space-separated list of the case-sensitive classes of the element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class
   */
  class?: MaybeArray<ResolvableValue<Stringable>> | Record<string, ResolvableValue<Stringable>>
  /**
   * The class global attribute is a space-separated list of the case-sensitive classes of the element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class
   */
  style?: MaybeArray<ResolvableValue<string>> | ResolvableProperties<CSSProperties>
}

export type Title = ResolvableValue<Stringable> | ResolvableProperties<({ textContent: Stringable } & SchemaAugmentations['title'])>
export type TitleTemplate = _TitleTemplate | Ref<_TitleTemplate> | ((title?: string) => _TitleTemplate)
export type Base = ResolvableProperties<_Base & SchemaAugmentations['base']>
export type Link = ResolvableProperties<LinkBase & DataKeys & SchemaAugmentations['link']> & MaybeEventFnHandlers<HttpEventAttributes>
export type Meta = ResolvableProperties<BaseMeta & DataKeys & SchemaAugmentations['meta']>
export type Style = ResolvableProperties<_Style & DataKeys & SchemaAugmentations['style']>
export type Script = ResolvableProperties<ScriptBase & DataKeys & SchemaAugmentations['script']> & MaybeEventFnHandlers<HttpEventAttributes>
export type Noscript = ResolvableProperties<_Noscript & DataKeys & SchemaAugmentations['noscript']>
export type HtmlAttributes = ResolvableProperties<HtmlAttr & DataKeys & SchemaAugmentations['htmlAttrs']>
export type BodyAttributes = ResolvableProperties<BodyAttr & DataKeys & SchemaAugmentations['bodyAttrs']> & MaybeEventFnHandlers<BodyEvents>

export interface ReactiveHead {
  /**
   * The `<title>` HTML element defines the document's title that is shown in a browser's title bar or a page's tab.
   * It only contains text; tags within the element are ignored.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/title
   */
  title?: Title
  /**
   * Generate the title from a template.
   */
  titleTemplate?: TitleTemplate
  /**
   * Variables used to substitute in the title and meta content.
   */
  templateParams?: ResolvableProperties<
    { separator?: '|' | '-' | '·' | string }
    & Record<string, Stringable | ResolvableProperties<Record<string, Stringable>>>
  >
  /**
   * The `<base>` HTML element specifies the base URL to use for all relative URLs in a document.
   * There can be only one <base> element in a document.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base
   */
  base?: Base
  /**
   * The `<link>` HTML element specifies relationships between the current document and an external resource.
   * This element is most commonly used to link to stylesheets, but is also used to establish site icons
   * (both "favicon" style icons and icons for the home screen and apps on mobile devices) among other things.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-as
   */
  link?: ResolvableArray<Link>
  /**
   * The `<meta>` element represents metadata that cannot be expressed in other HTML elements, like `<link>` or `<script>`.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta
   */
  meta?: ResolvableArray<Meta>
  /**
   * The `<style>` HTML element contains style information for a document, or part of a document.
   * It contains CSS, which is applied to the contents of the document containing the `<style>` element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/style
   */
  style?: ResolvableArray<(Style | string)>
  /**
   * The `<script>` HTML element is used to embed executable code or data; this is typically used to embed or refer to JavaScript code.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script
   */
  script?: ResolvableArray<(Script | string)>
  /**
   * The `<noscript>` HTML element defines a section of HTML to be inserted if a script type on the page is unsupported
   * or if scripting is currently turned off in the browser.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/noscript
   */
  noscript?: ResolvableArray<(Noscript | string)>
  /**
   * Attributes for the `<html>` HTML element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/html
   */
  htmlAttrs?: HtmlAttributes
  /**
   * Attributes for the `<body>` HTML element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body
   */
  bodyAttrs?: BodyAttributes
}

export type UseHeadOptions = Omit<HeadEntryOptions, 'head'> & { head?: VueHeadClient<any> }
export type UseHeadInput = ResolvableValue<ReactiveHead>
export type UseSeoMetaInput = ResolvableProperties<MetaFlatInput> & { title?: ReactiveHead['title'], titleTemplate?: ReactiveHead['titleTemplate'] }
export type VueHeadClient<I = UseHeadInput> = Unhead<I> & Plugin
