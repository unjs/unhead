import type { BaseBodyAttributes, BodyEvents, DataKeys, DefinedValueOrEmptyObject, HttpEventAttributes, LinkBase, MaybePromiseProps, Merge, MergeHead, MetaFlatInput, ScriptBase, Stringable, Base as _Base, HtmlAttributes as _HtmlAttributes, Meta as _Meta, Noscript as _Noscript, Style as _Style } from 'zhead'
import type { InnerContent, ResolvesDuplicates, TagPosition, TagPriority, TagUserProperties, TemplateParams } from './tags'

export type Never<T> = {
  [P in keyof T]?: never
}

export type UserTagConfigWithoutInnerContent = TagPriority & TagPosition & ResolvesDuplicates & Never<InnerContent> & { processTemplateParams?: false } // only allow opt-out
export type UserAttributesConfig = ResolvesDuplicates & TagPriority & Never<InnerContent & TagPosition>

export interface SchemaAugmentations extends MergeHead {
  title: TagPriority
  titleTemplate: TagPriority
  base: UserAttributesConfig
  htmlAttrs: UserAttributesConfig
  bodyAttrs: UserAttributesConfig
  link: UserTagConfigWithoutInnerContent
  meta: UserTagConfigWithoutInnerContent
  style: TagUserProperties
  script: TagUserProperties
  noscript: TagUserProperties
}

export type MaybeArray<T> = T | T[]

export type BaseBodyAttr = BaseBodyAttributes
export type BaseHtmlAttr = _HtmlAttributes

export interface BodyAttr extends Omit<BaseBodyAttr, 'class'> {
  /**
   * The class global attribute is a space-separated list of the case-sensitive classes of the element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class
   */
  class?: MaybeArray<string> | Record<string, boolean>
}

export interface HtmlAttr extends Omit<_HtmlAttributes, 'class'> {
  /**
   * The class global attribute is a space-separated list of the case-sensitive classes of the element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class
   */
  class?: MaybeArray<string> | Record<string, boolean>
}

export interface BaseMeta extends Omit<_Meta, 'content'> {
  /**
   * This attribute contains the value for the http-equiv, name or property attribute, depending on which is used.
   *
   * You can provide an array of values to create multiple tags sharing the same name, property or http-equiv.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#attr-content
   */
  content?: MaybeArray<Stringable> | null
}

export type EntryAugmentation = undefined | Record<string, any>

export type MaybeFunctionEntries<T> = {
  [key in keyof T]?: T[key] | ((e: Event) => void)
}

type TitleTemplateResolver = string | ((title?: string) => string | null)

export type Title = MaybePromiseProps<string | ({ textContent: string } & SchemaAugmentations['title']) | null>
export type TitleTemplate = TitleTemplateResolver | null | ({ textContent: TitleTemplateResolver } & SchemaAugmentations['titleTemplate'])
export type Base<E extends EntryAugmentation = {}> = Partial<Merge<SchemaAugmentations['base'], MaybePromiseProps<_Base>>> & DefinedValueOrEmptyObject<E>
export type Link<E extends EntryAugmentation = {}> = MaybePromiseProps<LinkBase> & MaybeFunctionEntries<HttpEventAttributes> & DataKeys & SchemaAugmentations['link'] & DefinedValueOrEmptyObject<E>
export type Meta<E extends EntryAugmentation = {}> = MaybePromiseProps<BaseMeta> & DataKeys & SchemaAugmentations['meta'] & DefinedValueOrEmptyObject<E>
export type Style<E extends EntryAugmentation = {}> = MaybePromiseProps<_Style> & DataKeys & SchemaAugmentations['style'] & DefinedValueOrEmptyObject<E>
export type Script<E extends EntryAugmentation = {}> = MaybePromiseProps<ScriptBase> & MaybeFunctionEntries<HttpEventAttributes> & DataKeys & SchemaAugmentations['script'] & DefinedValueOrEmptyObject<E>
export type Noscript<E extends EntryAugmentation = {}> = MaybePromiseProps<_Noscript> & DataKeys & SchemaAugmentations['noscript'] & DefinedValueOrEmptyObject<E>
export type HtmlAttributes<E extends EntryAugmentation = {}> = MaybePromiseProps<HtmlAttr> & DataKeys & SchemaAugmentations['htmlAttrs'] & DefinedValueOrEmptyObject<E>
export type BodyAttributes<E extends EntryAugmentation = {}> = MaybePromiseProps<BodyAttr> & MaybeFunctionEntries<BodyEvents> & DataKeys & SchemaAugmentations['bodyAttrs'] & DefinedValueOrEmptyObject<E>

export interface HeadUtils {
  /**
   * Generate the title from a template.
   *
   * Should include a `%s` placeholder for the title, for example `%s - My Site`.
   */
  titleTemplate?: TitleTemplate
  /**
   * Variables used to substitute in the title and meta content.
   */
  templateParams?: TemplateParams
}

export interface Head<E extends MergeHead = SchemaAugmentations> extends HeadUtils {
  /**
   * The `<title>` HTML element defines the document's title that is shown in a browser's title bar or a page's tab.
   * It only contains text; tags within the element are ignored.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/title
   */
  title?: Title | Promise<Title>
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
  link?: Link<E['link']>[]
  /**
   * The `<meta>` element represents metadata that cannot be expressed in other HTML elements, like `<link>` or `<script>`.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta
   */
  meta?: Meta<E['meta']>[]
  /**
   * The `<style>` HTML element contains style information for a document, or part of a document.
   * It contains CSS, which is applied to the contents of the document containing the `<style>` element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/style
   */
  style?: (Style<E['style']> | string)[]
  /**
   * The `<script>` HTML element is used to embed executable code or data; this is typically used to embed or refer to JavaScript code.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script
   */
  script?: (Script<E['script']> | string)[]
  /**
   * The `<noscript>` HTML element defines a section of HTML to be inserted if a script type on the page is unsupported
   * or if scripting is currently turned off in the browser.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/noscript
   */
  noscript?: (Noscript<E['noscript']> | string)[]
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

export type UseSeoMetaInput = MetaFlatInput & { title?: Title; titleTemplate?: TitleTemplate }

export type { MetaFlatInput, BodyEvents, MergeHead, DataKeys, DefinedValueOrEmptyObject, SpeculationRules } from 'zhead'
