import type { BaseBodyAttr, BaseHtmlAttr, DataKeys, DefinedValueOrEmptyObject, EntryAugmentation, MaybeArray, MergeHead, SchemaAugmentations, Base as _Base, Link as _Link, Meta as _Meta, Noscript as _Noscript, Script as _Script, Style as _Style, Title as _Title, TitleTemplate as _TitleTemplate } from '@unhead/schema'
import type { Ref } from 'vue'
import type { MaybeComputedRef, MaybeComputedRefEntries } from './util'

interface HtmlAttr extends Omit<BaseHtmlAttr, 'class'> {
  /**
   * The class global attribute is a space-separated list of the case-sensitive classes of the element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class
   */
  class?: MaybeArray<MaybeComputedRef<string>> | Record<string, MaybeComputedRef<boolean>>
}

interface BodyAttr extends Omit<BaseBodyAttr, 'class'> {
  /**
   * The class global attribute is a space-separated list of the case-sensitive classes of the element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class
   */
  class?: MaybeArray<MaybeComputedRef<string>> | Record<string, MaybeComputedRef<boolean>>
}

export type Title = MaybeComputedRef<_Title>
export type TitleTemplate = _TitleTemplate | Ref<_TitleTemplate> | ((title?: string) => _TitleTemplate)
export type Base<E extends EntryAugmentation = {}> = MaybeComputedRef<MaybeComputedRefEntries<_Base<E>>>
export type Link<E extends EntryAugmentation = {}> = MaybeComputedRefEntries<_Link<E>>
export type Meta<E extends EntryAugmentation = {}> = MaybeComputedRefEntries<_Meta<E>>
export type Style<E extends EntryAugmentation = {}> = MaybeComputedRefEntries<_Style<E>>
export type Script<E extends EntryAugmentation = {}> = MaybeComputedRefEntries<_Script<E>>
export type Noscript<E extends EntryAugmentation = {}> = MaybeComputedRefEntries<_Noscript<E>>
export type HtmlAttributes<E extends EntryAugmentation = {}> = MaybeComputedRef<MaybeComputedRefEntries<HtmlAttr & DataKeys & SchemaAugmentations['htmlAttrs'] & DefinedValueOrEmptyObject<E>>>
export type BodyAttributes<E extends EntryAugmentation = {}> = MaybeComputedRef<MaybeComputedRefEntries<BodyAttr & DataKeys & SchemaAugmentations['bodyAttrs'] & DefinedValueOrEmptyObject<E>>>

export interface ReactiveHead<E extends MergeHead = MergeHead> {
  /**
   * The <title> HTML element defines the document's title that is shown in a browser's title bar or a page's tab.
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
   * The <base> HTML element specifies the base URL to use for all relative URLs in a document.
   * There can be only one <base> element in a document.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base
   */
  base?: Base<E['base']>
  /**
   * The <link> HTML element specifies relationships between the current document and an external resource.
   * This element is most commonly used to link to stylesheets, but is also used to establish site icons
   * (both "favicon" style icons and icons for the home screen and apps on mobile devices) among other things.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-as
   */
  link?: MaybeComputedRef<Link<E['link']>[]>
  /**
   * The <meta> element represents metadata that cannot be expressed in other HTML elements, like <link> or <script>.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta
   */
  meta?: MaybeComputedRef<Meta<E['meta']>[]>
  /**
   * The <style> HTML element contains style information for a document, or part of a document.
   * It contains CSS, which is applied to the contents of the document containing the <style> element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/style
   */
  style?: MaybeComputedRef<Style<E['style']>[]>
  /**
   * The <script> HTML element is used to embed executable code or data; this is typically used to embed or refer to JavaScript code.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script
   */
  script?: MaybeComputedRef<Script<E['script']>[]>
  /**
   * The <noscript> HTML element defines a section of HTML to be inserted if a script type on the page is unsupported
   * or if scripting is currently turned off in the browser.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/noscript
   */
  noscript?: MaybeComputedRef<Noscript<E['noscript']>[]>
  /**
   * Attributes for the <html> HTML element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/html
   */
  htmlAttrs?: HtmlAttributes<E['htmlAttrs']>
  /**
   * Attributes for the <body> HTML element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/body
   */
  bodyAttrs?: BodyAttributes<E['bodyAttrs']>
}

export type UseHeadInput<T extends MergeHead = {}> = MaybeComputedRef<ReactiveHead<T>>
