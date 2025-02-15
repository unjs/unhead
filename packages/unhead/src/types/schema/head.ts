import type { InnerContent, ProcessesTemplateParams, ResolvesDuplicates, TagPosition, TagPriority, TagUserProperties, TemplateParams } from '../tags'
import type { DefinedValueOrEmptyObject, Falsey, Merge, MergeHead, Never, ResolvableProperties, ResolvableValue, Stringable } from '../util'
import type { DataKeys } from './attributes/data'
import type { HttpEventAttributes } from './attributes/event'
import type { Base as _Base } from './base'
import type { BaseBodyAttributes, BodyEvents } from './bodyAttributes'
import type { HtmlAttributes as _HtmlAttributes } from './htmlAttributes'
import type { LinkBase } from './link'
import type { Meta as _Meta } from './meta'
import type { MetaFlatInput } from './metaFlat'
import type { Noscript as _Noscript } from './noscript'
import type { ScriptBase } from './script'
import type { Style as _Style } from './style'

export type UserTagConfigWithoutInnerContent = TagPriority & TagPosition & ResolvesDuplicates & Never<InnerContent> & { processTemplateParams?: false } // only allow opt-out
export type UserAttributesConfig = ResolvesDuplicates & TagPriority & Never<InnerContent & TagPosition>

export interface SchemaAugmentations extends MergeHead {
  title: TagPriority
  titleTemplate: TagPriority
  base: UserAttributesConfig
  htmlAttrs: UserAttributesConfig
  bodyAttrs: UserAttributesConfig
  link: UserTagConfigWithoutInnerContent
  meta: TagPriority & { processTemplateParams?: false }
  style: TagUserProperties
  script: TagUserProperties
  noscript: TagUserProperties
}

export interface ResolvedSchemaAugmentations extends MergeHead {
  title: TagPriority
  titleTemplate: TagPriority
  base: ResolvesDuplicates & TagPriority & Never<InnerContent & TagPosition>
  htmlAttrs: ResolvesDuplicates & TagPriority & Never<InnerContent & TagPosition>
  bodyAttrs: ResolvesDuplicates & TagPriority & Never<InnerContent & TagPosition>
  link: TagPriority & TagPosition & ResolvesDuplicates & Never<InnerContent> & { processTemplateParams?: false }
  meta: TagPriority & TagPosition & ResolvesDuplicates & Never<InnerContent> & { processTemplateParams?: false }
  style: TagPriority & TagPosition & InnerContent & ResolvesDuplicates & ProcessesTemplateParams
  script: TagPriority & TagPosition & InnerContent & ResolvesDuplicates & ProcessesTemplateParams
  noscript: TagPriority & TagPosition & InnerContent & ResolvesDuplicates & ProcessesTemplateParams
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

export type MaybeEventFnHandlers<T> = {
  [key in keyof T]?: T[key] | ((e: Event) => void)
}

type TitleTemplateResolver = string | ((title?: string) => string | null)

export type Title = ResolvableValue<number | string | Falsey> | ResolvableProperties<({ textContent: string } & SchemaAugmentations['title'])>
export type TitleTemplate = TitleTemplateResolver | null | ({ textContent: TitleTemplateResolver } & SchemaAugmentations['titleTemplate'])
export type Base<E extends EntryAugmentation = Record<string, any>> = ResolvableProperties<_Base & SchemaAugmentations['base']> & DefinedValueOrEmptyObject<E>
export type Link<E extends EntryAugmentation = Record<string, any>> = ResolvableProperties<LinkBase & DataKeys & SchemaAugmentations['link']> & MaybeEventFnHandlers<HttpEventAttributes> & DefinedValueOrEmptyObject<E>
export type Meta<E extends EntryAugmentation = Record<string, any>> = ResolvableProperties<BaseMeta & DataKeys & SchemaAugmentations['meta']> & DefinedValueOrEmptyObject<E>
export type Style<E extends EntryAugmentation = Record<string, any>> = ResolvableProperties<_Style & DataKeys & SchemaAugmentations['style']> & DefinedValueOrEmptyObject<E>
export type Script<E extends EntryAugmentation = Record<string, any>> = ResolvableProperties<ScriptBase & DataKeys & SchemaAugmentations['script']> & MaybeEventFnHandlers<HttpEventAttributes> & DefinedValueOrEmptyObject<E>
export type Noscript<E extends EntryAugmentation = Record<string, any>> = ResolvableProperties<_Noscript & DataKeys & SchemaAugmentations['noscript']> & DefinedValueOrEmptyObject<E>
export type HtmlAttributes<E extends EntryAugmentation = Record<string, any>> = ResolvableProperties<HtmlAttr & DataKeys & SchemaAugmentations['htmlAttrs']> & DefinedValueOrEmptyObject<E>
export type BodyAttributes<E extends EntryAugmentation = Record<string, any>> = ResolvableProperties<BodyAttr & DataKeys & SchemaAugmentations['bodyAttrs']> & MaybeEventFnHandlers<BodyEvents> & DefinedValueOrEmptyObject<E>

export type ResolvedTitle = ({ textContent: string } & ResolvedSchemaAugmentations['title'])
export type ResolvedTitleTemplate = TitleTemplateResolver | null | ({ textContent: TitleTemplateResolver } & ResolvedSchemaAugmentations['titleTemplate'])
export type ResolvedBase<E extends EntryAugmentation = Record<string, any>> = Partial<Merge<ResolvedSchemaAugmentations['base'], _Base>> & DefinedValueOrEmptyObject<E>
export type ResolvedLink<E extends EntryAugmentation = Record<string, any>> = LinkBase & MaybeEventFnHandlers<HttpEventAttributes> & DataKeys & ResolvedSchemaAugmentations['link'] & DefinedValueOrEmptyObject<E>
export type ResolvedMeta<E extends EntryAugmentation = Record<string, any>> = BaseMeta & DataKeys & SchemaAugmentations['meta'] & DefinedValueOrEmptyObject<E>
export type ResolvedStyle<E extends EntryAugmentation = Record<string, any>> = _Style & DataKeys & ResolvedSchemaAugmentations['style'] & DefinedValueOrEmptyObject<E>
export type ResolvedScript<E extends EntryAugmentation = Record<string, any>> = ScriptBase & MaybeEventFnHandlers<HttpEventAttributes> & DataKeys & ResolvedSchemaAugmentations['script'] & DefinedValueOrEmptyObject<E>
export type ResolvedNoscript<E extends EntryAugmentation = Record<string, any>> = _Noscript & DataKeys & ResolvedSchemaAugmentations['noscript'] & DefinedValueOrEmptyObject<E>
export type ResolvedHtmlAttributes<E extends EntryAugmentation = Record<string, any>> = HtmlAttr & DataKeys & ResolvedSchemaAugmentations['htmlAttrs'] & DefinedValueOrEmptyObject<E>
export type ResolvedBodyAttributes<E extends EntryAugmentation = Record<string, any>> = BodyAttr & MaybeEventFnHandlers<BodyEvents> & DataKeys & ResolvedSchemaAugmentations['bodyAttrs'] & DefinedValueOrEmptyObject<E>

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
  title?: Title
  /**
   * The `<base>` HTML element specifies the base URL to use for all relative URLs in a document.
   * There can be only one <base> element in a document.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base
   */
  base?: ResolvableValue<Base<E['base']>>
  /**
   * The `<link>` HTML element specifies relationships between the current document and an external resource.
   * This element is most commonly used to link to stylesheets, but is also used to establish site icons
   * (both "favicon" style icons and icons for the home screen and apps on mobile devices) among other things.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-as
   */
  link?: ResolvableValue<ResolvableValue<Link<E['link']>>[]>
  /**
   * The `<meta>` element represents metadata that cannot be expressed in other HTML elements, like `<link>` or `<script>`.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta
   */
  meta?: ResolvableValue<ResolvableValue<Meta<E['meta']>>[]>
  /**
   * The `<style>` HTML element contains style information for a document, or part of a document.
   * It contains CSS, which is applied to the contents of the document containing the `<style>` element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/style
   */
  style?: ResolvableValue<ResolvableValue<(Style<E['style']> | string)>[]>
  /**
   * The `<script>` HTML element is used to embed executable code or data; this is typically used to embed or refer to JavaScript code.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script
   */
  script?: ResolvableValue<ResolvableValue<(Script<E['script']> | string)>[]>
  /**
   * The `<noscript>` HTML element defines a section of HTML to be inserted if a script type on the page is unsupported
   * or if scripting is currently turned off in the browser.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/noscript
   */
  noscript?: ResolvableValue<ResolvableValue<(Noscript<E['noscript']> | string)>[]>
  /**
   * Attributes for the `<html>` HTML element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/html
   */
  htmlAttrs?: ResolvableValue<HtmlAttributes<E['htmlAttrs']>>
  /**
   * Attributes for the `<body>` HTML element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body
   */
  bodyAttrs?: ResolvableValue<BodyAttributes<E['bodyAttrs']>>
}

export interface ResolvedHead<E extends MergeHead = ResolvedSchemaAugmentations> extends HeadUtils {
  title?: ResolvedTitle
  base?: ResolvedBase<E['base']>
  link?: ResolvedLink<E['link']>[]
  meta?: ResolvedMeta<E['meta']>[]
  style?: ResolvedStyle<E['style']>[]
  script?: ResolvedScript<E['script']>[]
  noscript?: ResolvedNoscript<E['noscript']>[]
  htmlAttrs?: ResolvedHtmlAttributes<E['htmlAttrs']>
  bodyAttrs?: ResolvedBodyAttributes<E['bodyAttrs']>
}

export type UseSeoMetaInput = MetaFlatInput & { title?: Title, titleTemplate?: TitleTemplate }
export type UseHeadInput<T extends MergeHead = MergeHead> = Head<T>

export { type BodyEvents, type DataKeys, type HttpEventAttributes, type LinkBase, type MetaFlatInput, type ScriptBase }
