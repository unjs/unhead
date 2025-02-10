import type { Booleanable, Stringable } from '../../util'

export interface GlobalAttributes {
  /**
   * Provides a hint for generating a keyboard shortcut for the current element. This attribute consists of a
   * space-separated list of characters. The browser should use the first one that exists on the computer keyboard layout.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/accesskey
   */
  accesskey?: string
  /**
   * Controls whether and how text input is automatically capitalized as it is entered/edited by the user.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/autocapitalize
   */
  autocapitalize?: 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters'
  /**
   * Indicates that an element is to be focused on page load, or as soon as the `<dialog>` it is part of is displayed.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/autofocus
   */
  autofocus?: Booleanable
  /**
   * A space-separated list of the classes of the element. Classes allows CSS and JavaScript to select and access
   * specific elements via the class selectors or functions like the method Document.getElementsByClassName().
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/class
   */
  class?: Stringable
  /**
   * An enumerated attribute indicating if the element should be editable by the user.
   * If so, the browser modifies its widget to allow editing.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/contenteditable
   */
  contenteditable?: Booleanable
  /**
   * An enumerated attribute indicating the directionality of the element's text.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/dir
   */
  dir?: 'ltr' | 'rtl' | 'auto'
  /**
   * An enumerated attribute indicating whether the element can be dragged, using the Drag and Drop API.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/draggable
   */
  draggable?: Booleanable
  /**
   * Hints what action label (or icon) to present for the enter key on virtual keyboards.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/enterkeyhint
   */
  enterkeyhint?: string
  /**
   * Used to transitively export shadow parts from a nested shadow tree into a containing light tree.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/exportparts
   */
  exportparts?: string
  /**
   * A Boolean attribute indicates that the element is not yet, or is no longer, relevant.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/hidden
   */
  hidden?: Booleanable
  /**
   * The id global attribute defines a unique identifier (ID) which must be unique in the whole document.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/id
   */
  id?: string
  /**
   * Provides a hint to browsers as to the type of virtual keyboard configuration to use when editing this element or its contents.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inputmode
   */
  inputmode?: string
  /**
   * Allows you to specify that a standard HTML element should behave like a registered custom built-in element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/is
   */
  is?: string
  /**
   * The unique, global identifier of an item.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/itemid
   */
  itemid?: string
  /**
   * Used to add properties to an item.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/itemprop
   */
  itemprop?: string
  /**
   * Properties that are not descendants of an element with the itemscope attribute can be associated with the item using an itemref.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/itemref
   */
  itemref?: string
  /**
   * itemscope (usually) works along with itemtype to specify that the HTML contained in a block is about a particular item.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/itemscope
   */
  itemscope?: string
  /**
   * Specifies the URL of the vocabulary that will be used to define itemprops (item properties) in the data structure.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/itemtype
   */
  itemtype?: string
  /**
   * Helps define the language of an element: the language that non-editable elements are in, or the language
   * that editable elements should be written in by the user.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/lang
   */
  lang?: string
  /**
   * A cryptographic nonce ("number used once") which can be used by Content Security Policy to determine whether or not
   * a given fetch will be allowed to proceed.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/nonce
   */
  nonce?: string
  /**
   * A space-separated list of the part names of the element. Part names allows CSS to select and style specific elements
   * in a shadow tree via the ::part pseudo-element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/part
   */
  part?: string
  /**
   * Assigns a slot in a shadow DOM shadow tree to an element: An element with a slot attribute is assigned to the slot
   * created by the `<slot>` element whose name attribute's value matches that slot attribute's value.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/slot
   */
  slot?: string
  /**
   * An enumerated attribute defines whether the element may be checked for spelling errors.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/spellcheck
   */
  spellcheck?: Booleanable
  /**
   * Contains CSS styling declarations to be applied to the element.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/style
   */
  style?: string
  /**
   * An integer attribute indicating if the element can take input focus (is focusable),
   * if it should participate to sequential keyboard navigation, and if so, at what position.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/tabindex
   */
  tabindex?: number
  /**
   * Contains a text representing advisory information related to the element it belongs to.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/title
   */
  title?: string
  /**
   * An enumerated attribute that is used to specify whether an element's attribute values and the values of its
   * Text node children are to be translated when the page is localized, or whether to leave them unchanged.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/translate
   */
  translate?: 'yes' | 'no' | ''
}
