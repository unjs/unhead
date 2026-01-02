import type { InnerContent, ProcessesTemplateParams, ResolvesDuplicates, TagPosition, TagPriority } from '../tags'
import type { DeepResolvableProperties, ResolvableProperties, ResolvableValue, Stringable } from '../util'
import type { Base } from './base'
import type { BodyAttributesWithoutEvents, BodyEvents } from './bodyAttributes'
import type { HtmlAttributes } from './htmlAttributes'
import type {
  Link,
  GenericLink,
  LinkHttpEvents,
  // Narrowed link types for re-export
  StylesheetLink,
  PreloadLink,
  PreloadImageLink,
  PreloadFontLink,
  PreloadScriptLink,
  PreloadStyleLink,
  PreloadOtherLink,
  ModulepreloadLink,
  PrefetchLink,
  IconLink,
  ManifestLink,
  CanonicalLink,
  DnsPrefetchLink,
  PreconnectLink,
  PrerenderLink,
  AlternateLink,
  AuthorLink,
  LicenseLink,
  HelpLink,
  SearchLink,
  PrevLink,
  NextLink,
  PingbackLink,
  LinkBase,
  PreloadLinkBase,
} from './link'
import type {
  Meta,
  NameMeta,
  PropertyMeta,
  HttpEquivMeta,
  CharsetMeta,
  MetaBase,
  MetaNames,
  MetaProperties,
} from './meta'
import type { MetaFlat } from './metaFlat'
import type { Noscript } from './noscript'
import type {
  Script,
  GenericScript,
  ScriptHttpEvents,
  // Narrowed script types for re-export
  ExternalScript,
  ModuleScript,
  InlineScript,
  InlineModuleScript,
  JsonLdScript,
  SpeculationRulesScript,
  ImportMapScript,
  ApplicationJsonScript,
  ScriptBase,
  ImportMapConfig,
} from './script'
import type { Style } from './style'
import type { DataKeys } from './attributes/data'

export interface SchemaAugmentations {
  title: TagPriority
  titleTemplate: TagPriority
  base: ResolvesDuplicates & TagPriority
  htmlAttrs: ResolvesDuplicates & TagPriority
  bodyAttrs: ResolvesDuplicates & TagPriority
  link: TagPriority & TagPosition & ResolvesDuplicates & ProcessesTemplateParams
  meta: TagPriority & ResolvesDuplicates & ProcessesTemplateParams
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

/**
 * Unhead meta with support for array content values
 */
export type UnheadMeta =
  | (Omit<NameMeta, 'content'> & { content?: MaybeArray<Stringable> | null })
  | (Omit<PropertyMeta, 'content'> & { content?: MaybeArray<Stringable> | null })
  | (Omit<HttpEquivMeta, 'content'> & { content?: MaybeArray<Stringable> | null })
  | CharsetMeta

export type MaybeEventFnHandlers<T> = {
  [key in keyof T]?: T[key] | ((e: Event) => void)
}

export type ResolvableTitle = ResolvableValue<Stringable> | ResolvableProperties<({ textContent: string } & SchemaAugmentations['title'])>
export type ResolvableTitleTemplate = string | ((title?: string) => string | null) | null | ({ textContent: string | ((title?: string) => string | null) } & SchemaAugmentations['titleTemplate'])
export type ResolvableBase = ResolvableProperties<Base & SchemaAugmentations['base']>
export type ResolvableLink = ResolvableProperties<Link & SchemaAugmentations['link']> & MaybeEventFnHandlers<LinkHttpEvents>
export type ResolvableMeta = ResolvableProperties<UnheadMeta & SchemaAugmentations['meta']>
export type ResolvableStyle = ResolvableProperties<Style & DataKeys & SchemaAugmentations['style']> | string
export type ResolvableScript = ResolvableProperties<Script & SchemaAugmentations['script']> & MaybeEventFnHandlers<ScriptHttpEvents> | string
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
  link?: (Link & SchemaAugmentations['link'])[]
  meta?: (Meta & SchemaAugmentations['meta'])[]
  style?: (Style & DataKeys & SchemaAugmentations['style'])[]
  script?: (Script & SchemaAugmentations['script'])[]
  noscript?: (Noscript & DataKeys & SchemaAugmentations['noscript'])[]
  htmlAttrs?: HtmlAttributes & DataKeys & SchemaAugmentations['htmlAttrs']
  bodyAttrs?: BodyAttributesWithoutEvents & DataKeys & BodyEvents & SchemaAugmentations['bodyAttrs']
}

export type RawInput<K extends keyof SerializableHead> = Required<SerializableHead>[K] extends Array<infer T> ? T : Required<SerializableHead>[K]

export type UseSeoMetaInput = DeepResolvableProperties<MetaFlat> & { title?: ResolvableTitle, titleTemplate?: ResolvableTitleTemplate }

export type UseHeadInput = ResolvableHead | SerializableHead

// ============================================================================
// Re-exports
// ============================================================================

// Attribute types
export type { AriaAttributes } from './attributes/aria'
export type { DataKeys } from './attributes/data'
export type { HttpEventAttributes } from './attributes/event'
export type { GlobalAttributes } from './attributes/global'

// Body/HTML attributes
export type { BodyAttributesWithoutEvents, BodyEvents } from './bodyAttributes'

// Link types (narrowed)
export type {
  Link,
  LinkBase,
  LinkHttpEvents,
  StylesheetLink,
  PreloadLink,
  PreloadLinkBase,
  PreloadImageLink,
  PreloadFontLink,
  PreloadScriptLink,
  PreloadStyleLink,
  PreloadOtherLink,
  ModulepreloadLink,
  PrefetchLink,
  IconLink,
  ManifestLink,
  CanonicalLink,
  DnsPrefetchLink,
  PreconnectLink,
  PrerenderLink,
  AlternateLink,
  AuthorLink,
  LicenseLink,
  HelpLink,
  SearchLink,
  PrevLink,
  NextLink,
  PingbackLink,
  GenericLink,
}

// Script types (narrowed)
export type {
  Script,
  ScriptBase,
  ScriptHttpEvents,
  ExternalScript,
  ModuleScript,
  InlineScript,
  InlineModuleScript,
  JsonLdScript,
  SpeculationRulesScript,
  ImportMapScript,
  ImportMapConfig,
  ApplicationJsonScript,
  GenericScript,
}

// Meta types (narrowed)
export type {
  Meta,
  MetaBase,
  MetaNames,
  MetaProperties,
  NameMeta,
  PropertyMeta,
  HttpEquivMeta,
  CharsetMeta,
}

// Other types
export type { MetaFlat } from './metaFlat'
export type { SpeculationRules } from './struct/speculationRules'

// Legacy exports for backwards compatibility
export type { GenericLink as LinkWithoutEvents } from './link'
export type { GenericScript as ScriptWithoutEvents } from './script'

// ============================================================================
// Utility Types for Internal Use
// ============================================================================
// These types provide access to all possible properties across union members,
// which is needed for internal code that dynamically creates/validates tags.

/**
 * Flat meta type with all properties optional (for internal use)
 * @internal
 */
export interface MetaGeneric extends MetaBase {
  name?: MetaNames | (string & Record<never, never>)
  property?: MetaProperties | (string & Record<never, never>)
  'http-equiv'?: 'content-security-policy' | 'content-type' | 'default-style' | 'x-ua-compatible' | 'refresh' | 'accept-ch' | (string & Record<never, never>)
  charset?: 'utf-8' | (string & Record<never, never>)
  content?: Stringable
}
