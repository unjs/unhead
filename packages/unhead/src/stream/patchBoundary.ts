import { closeTextElement, endComment, readTag } from '../parser/scanTemplate'

// The tokenizer reads the content of these elements as text until their end tag.
const TEXT_ELEMENTS = /* @__PURE__ */ new Set(['iframe', 'noembed', 'noframes', 'noscript', 'script', 'style', 'textarea', 'title', 'xmp'])
const TAG_START = /<\/?[a-z]/iy
const INVALID_TAG_NAME = /<\/?[a-z][^\t\n\f\r /<>="'`]*[<="'`]/iy
const ASCII_ALPHA = /[a-z]/i
const MAX_PENDING_LENGTH = 256 * 1024

export interface PatchBoundary {
  /** Add an app chunk. Returns `true` when a patch can follow it. */
  write: (chunk: Uint8Array) => boolean
  /** Returns `true` when the complete app HTML ends in body content. */
  end: () => boolean
}

/**
 * Report whether the app HTML written so far ends in body content.
 *
 * A late head patch is an inline script. Inside a tag, a comment or a text element,
 * it changes how the browser parses the app markup. Any input this cannot classify
 * returns `false`.
 */
export function createPatchBoundary(): PatchBoundary {
  const decoder = new TextDecoder()
  let pending = ''
  let textElement: string | undefined
  let unclassified = false

  // Returns the offset where unfinished markup starts.
  function scan(): number {
    let cursor = 0
    while (cursor < pending.length) {
      if (textElement) {
        const close = closeTextElement(pending, textElement, cursor)
        if (!close)
          return cursor
        textElement = undefined
        cursor = close.end
        continue
      }
      const open = pending.indexOf('<', cursor)
      if (open < 0)
        return pending.length
      const next = pending[open + 1]
      if (next === undefined || (next === '/' && open + 2 === pending.length))
        return open
      let end: number
      TAG_START.lastIndex = open
      if (pending.startsWith('<!--', open)) {
        end = endComment(pending, open + 4)
      }
      else if (next === '!' || next === '?' || (next === '/' && !ASCII_ALPHA.test(pending[open + 2]!))) {
        // A bogus comment ends at the next greater-than sign.
        const close = pending.indexOf('>', open + 2)
        end = close < 0 ? -1 : close + 1
      }
      else if (TAG_START.test(pending)) {
        const tag = readTag(pending, open)
        if (!tag) {
          INVALID_TAG_NAME.lastIndex = open
          unclassified = INVALID_TAG_NAME.test(pending)
          return open
        }
        if (!tag.closing && tag.name === 'plaintext') {
          unclassified = true
          return pending.length
        }
        if (!tag.closing && TEXT_ELEMENTS.has(tag.name))
          textElement = tag.name
        end = tag.end
      }
      else {
        cursor = open + 1
        continue
      }
      if (end < 0)
        return open
      cursor = end
    }
    return cursor
  }

  function append(text: string): boolean {
    if (unclassified)
      return false
    pending += text
    pending = pending.slice(scan())
    if (pending.length > MAX_PENDING_LENGTH)
      unclassified = true
    return !unclassified && !textElement && !pending
  }

  return {
    // A trailing greater-than sign cannot split UTF-8, a line break or a character reference.
    write: chunk => append(decoder.decode(chunk, { stream: true })) && chunk.at(-1) === 0x3E,
    end: () => append(decoder.decode()),
  }
}
