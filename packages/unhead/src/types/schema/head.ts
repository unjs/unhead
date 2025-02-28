import type { InnerContent, ProcessesTemplateParams, ResolvesDuplicates, TagPosition, TagPriority, TemplateParams } from '../tags'
import type { DeepResolvableProperties, ResolvableProperties, ResolvableValue, Stringable } from '../util'
import type { DataKeys } from './attributes/data'
import type { HttpEventAttributes } from './attributes/event'
import type { Base as _Base } from './base'
import type { BaseBodyAttributes, BodyEvents } from './bodyAttributes'
import type { HtmlAttributes as _HtmlAttributes } from './htmlAttributes'
import type { LinkBase } from './link'
import type { Meta as _Meta } from './meta'
import type { MetaFlat } from './metaFlat'
import type { Noscript as _Noscript } from './noscript'
import type { ScriptBase } from './script'
import type { SpeculationRules } from './struct/speculationRules'
import type { Style as _Style } from './style'

interface DeprecatedResolvesDuplicates {
  /**
   * @deprecated You should avoid using keys to dedupe meta as they are automatically deduped.
   * If you need to change the meta tag rendered use tagPriority.
   */
  key?: string
  /**
   * @deprecated Remove
   */
  tagDuplicateStrategy?: 'replace' | 'merge'
}

export interface SchemaAugmentations {
  title: TagPriority
  titleTemplate: TagPriority
  base: ResolvesDuplicates & TagPriority
  htmlAttrs: ResolvesDuplicates & TagPriority
  bodyAttrs: ResolvesDuplicates & TagPriority
  link: TagPriority & TagPosition & ResolvesDuplicates & ProcessesTemplateParams
  meta: TagPriority & DeprecatedResolvesDuplicates & ProcessesTemplateParams
  style: TagPriority & TagPosition & InnerContent & ResolvesDuplicates & ProcessesTemplateParams
  script: TagPriority & TagPosition & InnerContent & ResolvesDuplicates & ProcessesTemplateParams
  noscript: TagPriority & TagPosition & InnerContent & ResolvesDuplicates & ProcessesTemplateParams
}

export type MaybeArray<T> = T | T[]

export type BaseBodyAttr = BaseBodyAttributes
export type BaseHtmlAttr = _HtmlAttributes

export interface BodyAttr extends Omit<BaseBodyAttr, 'class' | 'style'> {
  /**
   * The class global attribute is a space-separated list of the case-sensitive classes of the element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class
   */
  class?: MaybeArray<ResolvableValue<Stringable>> | Record<string, ResolvableValue<boolean>>
  /**
   * The style attribute contains CSS styling declarations to be applied to the element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/style
   */
  style?: MaybeArray<ResolvableValue<Stringable>> | Record<string, ResolvableValue<Stringable>>
}

export interface HtmlAttr extends Omit<_HtmlAttributes, 'class' | 'style'> {
  /**
   * The class global attribute is a space-separated list of the case-sensitive classes of the element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class
   */
  class?: MaybeArray<ResolvableValue<Stringable>> | Record<string, ResolvableValue<boolean>>
  /**
   * The style attribute contains CSS styling declarations to be applied to the element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/style
   */
  style?: MaybeArray<ResolvableValue<Stringable>> | Record<string, ResolvableValue<Stringable>>
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

export type MaybeEventFnHandlers<T> = {
  [key in keyof T]?: T[key] | ((e: Event) => void)
}

type TitleTemplateResolver = string | ((title?: string) => string | null)

export type Title = ResolvableValue<Stringable> | ResolvableProperties<({ textContent: string } & SchemaAugmentations['title'])>
export type TitleTemplate = TitleTemplateResolver | null | ({ textContent: TitleTemplateResolver } & SchemaAugmentations['titleTemplate'])
export type Base = ResolvableProperties<_Base & SchemaAugmentations['base']>
export type Link = ResolvableProperties<LinkBase & DataKeys & SchemaAugmentations['link']> & MaybeEventFnHandlers<HttpEventAttributes>
export type Meta = ResolvableProperties<BaseMeta & DataKeys & SchemaAugmentations['meta']>
export type Style = ResolvableProperties<_Style & DataKeys & SchemaAugmentations['style']>
export type Script = ResolvableProperties<ScriptBase & DataKeys & SchemaAugmentations['script']> & MaybeEventFnHandlers<HttpEventAttributes>
export type Noscript = ResolvableProperties<_Noscript & DataKeys & SchemaAugmentations['noscript']>
export type HtmlAttributes = ResolvableProperties<HtmlAttr & DataKeys & SchemaAugmentations['htmlAttrs']>
export type BodyAttributes = ResolvableProperties<BodyAttr & DataKeys & SchemaAugmentations['bodyAttrs']> & MaybeEventFnHandlers<BodyEvents>

export interface ResolvableHead {
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
  base?: ResolvableValue<Base>
  /**
   * The `<link>` HTML element specifies relationships between the current document and an external resource.
   * This element is most commonly used to link to stylesheets, but is also used to establish site icons
   * (both "favicon" style icons and icons for the home screen and apps on mobile devices) among other things.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-as
   */
  link?: ResolvableValue<ResolvableValue<Link>[]>
  /**
   * The `<meta>` element represents metadata that cannot be expressed in other HTML elements, like `<link>` or `<script>`.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta
   */
  meta?: ResolvableValue<ResolvableValue<Meta>[]>
  /**
   * The `<style>` HTML element contains style information for a document, or part of a document.
   * It contains CSS, which is applied to the contents of the document containing the `<style>` element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/style
   */
  style?: ResolvableValue<ResolvableValue<(Style | string)>[]>
  /**
   * The `<script>` HTML element is used to embed executable code or data; this is typically used to embed or refer to JavaScript code.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script
   */
  script?: ResolvableValue<ResolvableValue<(Script | string)>[]>
  /**
   * The `<noscript>` HTML element defines a section of HTML to be inserted if a script type on the page is unsupported
   * or if scripting is currently turned off in the browser.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/noscript
   */
  noscript?: ResolvableValue<ResolvableValue<(Noscript | string)>[]>
  /**
   * Attributes for the `<html>` HTML element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/html
   */
  htmlAttrs?: ResolvableValue<HtmlAttributes>
  /**
   * Attributes for the `<body>` HTML element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body
   */
  bodyAttrs?: ResolvableValue<BodyAttributes>
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

export interface SerializableHead {
  /**
   * Generate the title from a template.
   *
   * Should include a `%s` placeholder for the title, for example `%s - My Site`.
   */
  titleTemplate?: string
  /**
   * Variables used to substitute in the title and meta content.
   */
  templateParams?: TemplateParams
  title?: string | ({ textContent: string } & SchemaAugmentations['title'])
  base?: _Base & SchemaAugmentations['base'] & DataKeys
  link?: (LinkBase & SchemaAugmentations['link'] & DataKeys & HttpEventAttributes)[]
  meta?: (_Meta & SchemaAugmentations['meta'] & DataKeys)[]
  style?: (_Style & SchemaAugmentations['style'] & DataKeys)[]
  script?: (ScriptBase & SchemaAugmentations['script'] & DataKeys & HttpEventAttributes)[]
  noscript?: (_Noscript & SchemaAugmentations['noscript'] & DataKeys)[]
  htmlAttrs?: _HtmlAttributes & SchemaAugmentations['htmlAttrs'] & DataKeys
  bodyAttrs?: BaseBodyAttr & SchemaAugmentations['bodyAttrs'] & DataKeys & BodyEvents
}

export type Head = SerializableHead
export type ResolvedHead = SerializableHead

export type UseSeoMetaInput = DeepResolvableProperties<MetaFlat> & { title?: Title, titleTemplate?: TitleTemplate }

export type UseHeadInput = ResolvableHead | SerializableHead

type MetaFlatInput = MetaFlat

export { type BodyEvents, type DataKeys, type HttpEventAttributes, type LinkBase, type MetaFlat, type MetaFlatInput, type ScriptBase, type SpeculationRules }

/**
 * @deprecated No longer used
 */
export type MergeHead = Record<string, any>
