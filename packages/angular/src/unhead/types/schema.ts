import type { Signal } from '@angular/core'
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
  DefinedValueOrEmptyObject,
  EntryAugmentation,
  Falsey,
  HeadEntryOptions,
  HttpEventAttributes,
  LinkBase,
  MaybeArray,
  MaybeEventFnHandlers,
  MaybeFunction,
  MergeHead,
  MetaFlatInput,
  ResolvableValues,
  SchemaAugmentations,
  ScriptBase,
  Unhead,
} from 'unhead/types'
import type { MaybeSignal, ResolvableArray, ResolvableProperties } from './util'

export interface HtmlAttr extends Omit<BaseHtmlAttr, 'class'> {
  /**
   * The class global attribute is a space-separated list of the case-sensitive classes of the element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class
   */
  class?: MaybeArray<MaybeSignal<string>> | Record<string, MaybeSignal<boolean>>
}

export interface BodyAttr extends Omit<BaseBodyAttr, 'class' | 'style'> {
  /**
   * The class global attribute is a space-separated list of the case-sensitive classes of the element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class
   */
  class?: MaybeArray<MaybeSignal<string>> | Record<string, MaybeSignal<boolean>>
  /**
   * The class global attribute is a space-separated list of the case-sensitive classes of the element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class
   */
  style?: MaybeArray<MaybeSignal<string>> | Record<string, MaybeSignal<string | boolean>>
}

export type Title = MaybeFunction<number | string | Falsey> | ResolvableValues<({ textContent: string } & SchemaAugmentations['title'])>
export type TitleTemplate = _TitleTemplate | Signal<_TitleTemplate> | ((title?: string) => _TitleTemplate)
export type Base<E extends EntryAugmentation = Record<string, any>> = ResolvableProperties<_Base & SchemaAugmentations['base']> & DefinedValueOrEmptyObject<E>
export type Link<E extends EntryAugmentation = Record<string, any>> = ResolvableProperties<LinkBase & DataKeys & SchemaAugmentations['link']> & MaybeEventFnHandlers<HttpEventAttributes> & DefinedValueOrEmptyObject<E>
export type Meta<E extends EntryAugmentation = Record<string, any>> = ResolvableProperties<BaseMeta & DataKeys & SchemaAugmentations['meta']> & DefinedValueOrEmptyObject<E>
export type Style<E extends EntryAugmentation = Record<string, any>> = ResolvableProperties<_Style & DataKeys & SchemaAugmentations['style']> & DefinedValueOrEmptyObject<E>
export type Script<E extends EntryAugmentation = Record<string, any>> = ResolvableProperties<ScriptBase & DataKeys & SchemaAugmentations['script']> & MaybeEventFnHandlers<HttpEventAttributes> & DefinedValueOrEmptyObject<E>
export type Noscript<E extends EntryAugmentation = Record<string, any>> = ResolvableProperties<_Noscript & DataKeys & SchemaAugmentations['noscript']> & DefinedValueOrEmptyObject<E>
export type HtmlAttributes<E extends EntryAugmentation = Record<string, any>> = ResolvableProperties<HtmlAttr & DataKeys & SchemaAugmentations['htmlAttrs']> & DefinedValueOrEmptyObject<E>
export type BodyAttributes<E extends EntryAugmentation = Record<string, any>> = ResolvableProperties<BodyAttr & DataKeys & SchemaAugmentations['bodyAttrs']> & MaybeEventFnHandlers<BodyEvents> & DefinedValueOrEmptyObject<E>

export interface ReactiveHead<E extends MergeHead = MergeHead> {
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
  templateParams?: ResolvableArray<{ separator?: '|' | '-' | '·' | string } & Record<string, null | string | ResolvableArray<Record<string, null | string>>>>
  /**
   * The `<base>` HTML element specifies the base URL to use for all relative URLs in a document.
   * There can be only one <base> element in a document.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base
   */
  base?: Base<E['base']>
  /**
   * The `<link>` HTML element specifies relationships between the current document and an external resource.
   * This element is most commonly used to link to stylesheets, but is also used to establish site icons
   * (both "favicon" style icons and icons for the home screen and apps on mobile devices) among other things.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-as
   */
  link?: ResolvableArray<Link<E['link']>>
  /**
   * The `<meta>` element represents metadata that cannot be expressed in other HTML elements, like `<link>` or `<script>`.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta
   */
  meta?: ResolvableArray<Meta<E['meta']>>
  /**
   * The `<style>` HTML element contains style information for a document, or part of a document.
   * It contains CSS, which is applied to the contents of the document containing the `<style>` element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/style
   */
  style?: ResolvableArray<(Style<E['style']> | string)>
  /**
   * The `<script>` HTML element is used to embed executable code or data; this is typically used to embed or refer to JavaScript code.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script
   */
  script?: ResolvableArray<(Script<E['script']> | string)>
  /**
   * The `<noscript>` HTML element defines a section of HTML to be inserted if a script type on the page is unsupported
   * or if scripting is currently turned off in the browser.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/noscript
   */
  noscript?: ResolvableArray<(Noscript<E['noscript']> | string)>
  /**
   * Attributes for the `<html>` HTML element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/html
   */
  htmlAttrs?: HtmlAttributes<E['htmlAttrs']>
  /**
   * Attributes for the `<body>` HTML element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body
   */
  bodyAttrs?: BodyAttributes<E['bodyAttrs']>
}

export type UseHeadOptions = Omit<HeadEntryOptions, 'head'> & { head?: AngularUnhead }
export type UseHeadInput<T extends MergeHead = Record<string, any>> = ReactiveHead<T>
export type UseSeoMetaInput = ResolvableProperties<MetaFlatInput> & { title?: ReactiveHead['title'], titleTemplate?: ReactiveHead['titleTemplate'] }
export type AngularUnhead = Unhead<ReactiveHead> & Plugin
