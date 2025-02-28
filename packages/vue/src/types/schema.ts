import type {
  ResolvableTitleTemplate as _ResolvableTitleTemplate,
  Base,
  BodyAttributesWithoutEvents,
  BodyEvents,
  DataKeys,
  HeadEntryOptions,
  HtmlAttributes,
  HttpEventAttributes,
  LinkWithoutEvents,
  MaybeArray,
  MaybeEventFnHandlers,
  MetaFlatInput,
  Noscript,
  SchemaAugmentations,
  ScriptWithoutEvents,
  Stringable,
  Style,
  Unhead,
  UnheadMeta,
} from 'unhead/types'
import type { CSSProperties, Plugin, Ref } from 'vue'
import type { ResolvableArray, ResolvableProperties, ResolvableValue } from './util'

export interface HtmlAttr extends Omit<HtmlAttributes, 'class' | 'style'> {
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

export interface BodyAttr extends Omit<BodyAttributesWithoutEvents, 'class' | 'style'> {
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

export type ResolvableTitle = ResolvableValue<Stringable> | ResolvableProperties<({ textContent: Stringable } & SchemaAugmentations['title'])>
export type ResolvableTitleTemplate = _ResolvableTitleTemplate | Ref<string>
export type ResolvableBase = ResolvableProperties<Base & SchemaAugmentations['base']>
export type ResolvableLink = ResolvableProperties<LinkWithoutEvents & DataKeys & SchemaAugmentations['link']> & MaybeEventFnHandlers<HttpEventAttributes>
export type ResolvableMeta = ResolvableProperties<UnheadMeta & DataKeys & SchemaAugmentations['meta']>
export type ResolvableStyle = ResolvableProperties<Style & DataKeys & SchemaAugmentations['style']>
export type ResolvableScript = ResolvableProperties<ScriptWithoutEvents & DataKeys & SchemaAugmentations['script']> & MaybeEventFnHandlers<HttpEventAttributes>
export type ResolvableNoscript = ResolvableProperties<Noscript & DataKeys & SchemaAugmentations['noscript']>
export type ResolvableHtmlAttributes = ResolvableProperties<HtmlAttr & DataKeys & SchemaAugmentations['htmlAttrs']>
export type ResolvableBodyAttributes = ResolvableProperties<BodyAttr & DataKeys & SchemaAugmentations['bodyAttrs']> & MaybeEventFnHandlers<BodyEvents>

export interface ReactiveHead {
  /**
   * The `<title>` HTML element defines the document's title that is shown in a browser's title bar or a page's tab.
   * It only contains text; tags within the element are ignored.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/title
   */
  title?: ResolvableTitle
  /**
   * Generate the title from a template.
   */
  titleTemplate?: ResolvableTitleTemplate
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
  base?: ResolvableBase
  /**
   * The `<link>` HTML element specifies relationships between the current document and an external resource.
   * This element is most commonly used to link to stylesheets, but is also used to establish site icons
   * (both "favicon" style icons and icons for the home screen and apps on mobile devices) among other things.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-as
   */
  link?: ResolvableArray<ResolvableLink>
  /**
   * The `<meta>` element represents metadata that cannot be expressed in other HTML elements, like `<link>` or `<script>`.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta
   */
  meta?: ResolvableArray<ResolvableMeta>
  /**
   * The `<style>` HTML element contains style information for a document, or part of a document.
   * It contains CSS, which is applied to the contents of the document containing the `<style>` element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/style
   */
  style?: ResolvableArray<(ResolvableStyle | string)>
  /**
   * The `<script>` HTML element is used to embed executable code or data; this is typically used to embed or refer to JavaScript code.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script
   */
  script?: ResolvableArray<(ResolvableScript | string)>
  /**
   * The `<noscript>` HTML element defines a section of HTML to be inserted if a script type on the page is unsupported
   * or if scripting is currently turned off in the browser.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/noscript
   */
  noscript?: ResolvableArray<(ResolvableNoscript | string)>
  /**
   * Attributes for the `<html>` HTML element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/html
   */
  htmlAttrs?: ResolvableHtmlAttributes
  /**
   * Attributes for the `<body>` HTML element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body
   */
  bodyAttrs?: ResolvableBodyAttributes
}

export type UseHeadOptions = Omit<HeadEntryOptions, 'head'> & { head?: VueHeadClient<any> }
// eslint-disable-next-line unused-imports/no-unused-vars
export type UseHeadInput<Deprecated = never> = ResolvableValue<ReactiveHead>
export type UseSeoMetaInput = ResolvableProperties<MetaFlatInput> & { title?: ReactiveHead['title'], titleTemplate?: ReactiveHead['titleTemplate'] }
export type VueHeadClient<I = UseHeadInput> = Unhead<I> & Plugin
