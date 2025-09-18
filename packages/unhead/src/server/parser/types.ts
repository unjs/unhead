// Element nodes represent HTML tags with attributes
export interface ElementNode extends Node {
  /** Element tag name (for ELEMENT_NODE) */
  name: string
  /** HTML attributes (for ELEMENT_NODE) */
  attributes: Record<string, string>
  /** ID of the tag for fast handler lookup */
  tagId?: number
  /** Map of tag names to their nesting count (using Uint8Array for performance) */
  depthMap: Uint8Array
  /** Plugin outputs collected during processing */
  pluginOutput?: string[]
}

export interface TextNode extends Node {
  /** Text content (for TEXT_NODE) */
  value: string
  excludedFromMarkdown?: boolean
}

/**
 * Base DOM node interface
 * Optimized for streaming HTML parsing with minimal memory footprint
 */
export interface Node {
  /** Node type (ELEMENT_NODE or TEXT_NODE) */
  type: number

  /** Current nesting depth in the DOM tree */
  depth: number

  /** Node exclusion and filtering now handled by plugins */

  /** Index of this node within its parent's children */
  index: number

  /** Current walk index for child traversal during streaming */
  currentWalkIndex?: number

  /** Count of text child nodes - used for whitespace handling */
  childTextNodeIndex?: number

  /** Whether node contains whitespace - used for whitespace optimization */
  containsWhitespace?: boolean

  /** Parent node */
  parent?: ElementNode | null // parent will always be an element or null

  /** Region ID for buffer region tracking */
  regionId?: number
}

/**
 * State interface for HTML parsing and processing
 * Contains parsing state that's maintained during HTML traversal
 */
export interface MdreamProcessingState {
  /** Map of tag names to their current nesting depth - uses TypedArray for performance */
  depthMap: Uint8Array

  /** Current overall nesting depth */
  depth: number

  /** Currently processing element node */
  currentNode?: ElementNode | null

  /** Node filtering and exclusion is now handled by plugins */

  /** Whether current content contains HTML entities that need decoding */
  hasEncodedHtmlEntity?: boolean

  /** Whether the last processed character was whitespace - for collapsing whitespace */
  lastCharWasWhitespace?: boolean

  /** Whether the last processed buffer has whitespace - optimization flag */
  textBufferContainsWhitespace?: boolean

  /** Whether the last processed buffer contains non-whitespace characters */
  textBufferContainsNonWhitespace?: boolean

  /** Whether a tag was just closed - affects whitespace handling */
  justClosedTag?: boolean

  /** Whether the next text node is the first in its element - for whitespace trimming */
  isFirstTextInElement?: boolean

  /** Reference to the last processed text node - for context tracking */
  lastTextNode?: Node

  /** Quote state tracking for non-nesting tags - avoids backward scanning */
  inSingleQuote?: boolean
  inDoubleQuote?: boolean
  inBacktick?: boolean

  /** Backslash escaping state tracking - avoids checking previous character */
  lastCharWasBackslash?: boolean
}

/**
 * Runtime state for markdown generation
 * Extended state that includes output tracking and options
 */
export interface MdreamRuntimeState extends Partial<MdreamProcessingState> {
  /** Number of newlines at end of most recent output */
  lastNewLines?: number

  /** Table processing state - specialized for Markdown tables */
  tableRenderedTable?: boolean
  tableCurrentRowCells?: number
  tableColumnAlignments?: string[]

  /** Map of region IDs to buffer regions for O(1) lookups */
  regionToggles: Map<number, boolean>

  /** Content buffers for regions */
  regionContentBuffers: Map<number, string[]>

  /** Performance cache for last content to avoid iteration */
  lastContentCache?: string

  /** Reference to the last processed node */
  lastNode?: Node
}

type NodeEventEnter = 0
type NodeEventExit = 1

/**
 * Node event for DOM traversal
 * Used in the event-based traversal system for streaming processing
 */
export interface NodeEvent {
  /** Event type - enter (start tag) or exit (end tag) */
  type: NodeEventEnter | NodeEventExit

  /** The node being processed */
  node: Node
}

/**
 * Handler context for markdown conversion
 * Passed to tag handler functions for converting specific elements
 */
export interface HandlerContext {
  /** Current node being processed */
  node: ElementNode

  /** Parent node (if any) */
  parent?: ElementNode

  /** Runtime state */
  state: MdreamRuntimeState
}
