import type { InnerContent, ProcessesTemplateParams, ResolvesDuplicates, TagPosition, TagPriority } from '../tags'
import type { DeepResolvableProperties, ResolvableProperties, ResolvableValue, Stringable } from '../util'
import type { DataKeys } from './attributes/data'
import type { HttpEventAttributes } from './attributes/event'
import type { Base } from './base'
import type { BodyAttributesWithoutEvents, BodyEvents } from './bodyAttributes'
import type { HtmlAttributes } from './htmlAttributes'
import type { LinkWithoutEvents } from './link'
import type { Meta } from './meta'
import type { MetaFlat } from './metaFlat'
import type { Noscript } from './noscript'
import type { ScriptWithoutEvents } from './script'
import type { Style } from './style'

export interface SchemaAugmentations {
  title: TagPriority
  titleTemplate: TagPriority
  base: ResolvesDuplicates & TagPriority
  htmlAttrs: ResolvesDuplicates & TagPriority
  bodyAttrs: ResolvesDuplicates & TagPriority
  link: TagPriority & TagPosition & ResolvesDuplicates & ProcessesTemplateParams
  meta: TagPriority & ProcessesTemplateParams
  style: TagPriority & TagPosition & InnerContent & ResolvesDuplicates & ProcessesTemplateParams
  script: TagPriority & TagPosition & InnerContent & ResolvesDuplicates & ProcessesTemplateParams
  noscript: TagPriority & TagPosition & InnerContent & ResolvesDuplicates & ProcessesTemplateParams
}

export type MaybeArray<T> = T | T[]

export interface UnheadBodyAttributesWithoutEvents extends Omit<BodyAttributesWithoutEvents, 'class' | 'style'> {
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

export interface UnheadHtmlAttributes extends Omit<HtmlAttributes, 'class' | 'style'> {
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

export interface UnheadMeta extends Omit<Meta, 'content'> {
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

export type ResolvableTitle = ResolvableValue<Stringable> | ResolvableProperties<({ textContent: string } & SchemaAugmentations['title'])>
export type ResolvableTitleTemplate = string | ((title?: string) => string | null) | null | ({ textContent: string | ((title?: string) => string | null) } & SchemaAugmentations['titleTemplate'])
export type ResolvableBase = ResolvableProperties<Base & SchemaAugmentations['base']>
export type ResolvableLink = ResolvableProperties<LinkWithoutEvents & DataKeys & SchemaAugmentations['link']> & MaybeEventFnHandlers<HttpEventAttributes>
export type ResolvableMeta = ResolvableProperties<UnheadMeta & DataKeys & SchemaAugmentations['meta']>
export type ResolvableStyle = ResolvableProperties<Style & DataKeys & SchemaAugmentations['style']> | string
export type ResolvableScript = ResolvableProperties<ScriptWithoutEvents & DataKeys & SchemaAugmentations['script']> & MaybeEventFnHandlers<HttpEventAttributes> | string
export type ResolvableNoscript = ResolvableProperties<Noscript & DataKeys & SchemaAugmentations['noscript']> | string
export type ResolvableHtmlAttributes = ResolvableProperties<UnheadHtmlAttributes & DataKeys & SchemaAugmentations['htmlAttrs']>
export type ResolvableBodyAttributes = ResolvableProperties<UnheadBodyAttributesWithoutEvents & DataKeys & SchemaAugmentations['bodyAttrs']> & MaybeEventFnHandlers<BodyEvents>
export type ResolvableTemplateParams = { separator?: '|' | '-' | '·' | string } & Record<string, null | string | Record<string, string>>

export interface ResolvableHead {
  /**
   * The `<title>` HTML element defines the document's title that is shown in a browser's title bar or a page's tab.
   * It only contains text; tags within the element are ignored.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/title
   */
  title?: ResolvableTitle
  /**
   * The `<base>` HTML element specifies the base URL to use for all relative URLs in a document.
   * There can be only one <base> element in a document.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base
   */
  base?: ResolvableValue<ResolvableBase>
  /**
   * The `<link>` HTML element specifies relationships between the current document and an external resource.
   * This element is most commonly used to link to stylesheets, but is also used to establish site icons
   * (both "favicon" style icons and icons for the home screen and apps on mobile devices) among other things.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-as
   */
  link?: ResolvableValue<ResolvableValue<ResolvableLink>[]>
  /**
   * The `<meta>` element represents metadata that cannot be expressed in other HTML elements, like `<link>` or `<script>`.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta
   */
  meta?: ResolvableValue<ResolvableValue<ResolvableMeta>[]>
  /**
   * The `<style>` HTML element contains style information for a document, or part of a document.
   * It contains CSS, which is applied to the contents of the document containing the `<style>` element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/style
   */
  style?: ResolvableValue<ResolvableValue<(ResolvableStyle)>[]>
  /**
   * The `<script>` HTML element is used to embed executable code or data; this is typically used to embed or refer to JavaScript code.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script
   */
  script?: ResolvableValue<ResolvableValue<(ResolvableScript)>[]>
  /**
   * The `<noscript>` HTML element defines a section of HTML to be inserted if a script type on the page is unsupported
   * or if scripting is currently turned off in the browser.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/noscript
   */
  noscript?: ResolvableValue<ResolvableValue<(ResolvableNoscript)>[]>
  /**
   * Attributes for the `<html>` HTML element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/html
   */
  htmlAttrs?: ResolvableValue<ResolvableHtmlAttributes>
  /**
   * Attributes for the `<body>` HTML element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body
   */
  bodyAttrs?: ResolvableValue<ResolvableBodyAttributes>
  /**
   * Generate the title from a template.
   *
   * Should include a `%s` placeholder for the title, for example `%s - My Site`.
   */
  titleTemplate?: ResolvableTitleTemplate
  /**
   * Variables used to substitute in the title and meta content.
   */
  templateParams?: ResolvableTemplateParams
}

export interface SerializableHead {
  title?: string
  titleTemplate?: string
  base?: Base & DataKeys & SchemaAugmentations['base']
  templateParams?: Record<string, any>
  link?: (LinkWithoutEvents & DataKeys & HttpEventAttributes & SchemaAugmentations['link'])[]
  meta?: (Meta & DataKeys & SchemaAugmentations['meta'])[]
  style?: (Style & DataKeys & SchemaAugmentations['style'])[]
  script?: (ScriptWithoutEvents & DataKeys & HttpEventAttributes & SchemaAugmentations['script'])[]
  noscript?: (Noscript & DataKeys & SchemaAugmentations['noscript'])[]
  htmlAttrs?: HtmlAttributes & DataKeys & SchemaAugmentations['htmlAttrs']
  bodyAttrs?: BodyAttributesWithoutEvents & DataKeys & BodyEvents & SchemaAugmentations['bodyAttrs']
}

export type RawInput<K extends keyof SerializableHead> = Required<SerializableHead>[K] extends Array<infer T> ? T : Required<SerializableHead>[K]

export type UseSeoMetaInput = DeepResolvableProperties<MetaFlat> & { title?: ResolvableTitle, titleTemplate?: ResolvableTitleTemplate }

export type UseHeadInput = ResolvableHead | SerializableHead

export type { AriaAttributes } from './attributes/aria'
export type { DataKeys } from './attributes/data'
export type { HttpEventAttributes } from './attributes/event'
export type { GlobalAttributes } from './attributes/global'
export type { BodyAttributesWithoutEvents, BodyEvents } from './bodyAttributes'
export type { LinkWithoutEvents } from './link'
export type { MetaFlat } from './metaFlat'
export type { ScriptWithoutEvents } from './script'
export type { SpeculationRules } from './struct/speculationRules'
