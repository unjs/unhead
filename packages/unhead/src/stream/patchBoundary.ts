// Tokens that start or end script content, text elements and comments.
const TOKEN_RE = /<!--|--!?>|<(\/?)(script|iframe|noembed|noframes|noscript|style|textarea|title|xmp)(?=[\t\n\f\r />])|[<>"']/gi
// The longest token plus its lookahead character.
const TAIL_LENGTH = 11
// After `<`, these characters start markup. Anything else leaves the `<` as text.
const MARKUP_START = /[a-z/!?]/i

const OUTSIDE = 0
const DATA = 1
const ESCAPED = 2
const DOUBLE_ESCAPED = 3

/**
 * Track whether streamed app HTML ends where a late head patch can go.
 *
 * A patch is an inline script, and its end tag would close an app script early. Script
 * tracking changes at completed tags and ignores tokens inside quoted attributes.
 * Waiting inside text elements and comments keeps the patch out of visible text.
 *
 * Returns `true` when the HTML so far ends outside those contexts.
 */
export function createPatchBoundary(): (text: string) => boolean {
  let tail = ''
  let script = OUTSIDE
  let text: string | undefined
  let comment = false
  let offset = 0
  // `unresolved` marks a `<` at a chunk end, before its next character arrives.
  let pending: { start: number, name?: string, closing: boolean, quote?: string, unresolved?: true } | undefined
  return (chunk) => {
    const html = tail + chunk
    if (pending?.unresolved) {
      const next = html[pending.start + 1 - offset + tail.length]
      if (next !== undefined) {
        if (MARKUP_START.test(next))
          pending.unresolved = undefined
        else
          pending = undefined
      }
    }
    for (const match of html.matchAll(TOKEN_RE)) {
      const [token, slash, tag] = match
      // The previous call read every token that ended inside the tail, including its lookahead.
      if (match.index! + token.length + (tag ? 1 : 0) <= tail.length)
        continue
      const name = tag?.toLowerCase()
      const start = offset - tail.length + match.index!
      if (pending) {
        // A token split across chunks can first arrive as a bare `<`.
        if (start === pending.start && (tag || token === '<!--')) {
          if (token === '<!--') {
            pending = undefined
            comment = true
          }
          else {
            pending.name = name
            pending.closing = !!slash
          }
        }
        else if (pending.quote) {
          if (token === pending.quote)
            pending.quote = undefined
        }
        else if (token === '"' || token === '\'') {
          pending.quote = token
        }
        // `-->` in an unquoted attribute value still ends the tag at its `>`.
        else if (token.endsWith('>')) {
          if (pending.name === 'script')
            script = pending.closing ? OUTSIDE : DATA
          else if (pending.name)
            text = pending.closing ? undefined : pending.name
          pending = undefined
        }
        continue
      }
      if (script !== OUTSIDE) {
        if (token === '<!--' || token.startsWith('--')) {
          script = token === '<!--' ? (script === DATA ? ESCAPED : script) : (token === '-->' && script > DATA ? DATA : script)
        }
        else if (name === 'script') {
          if (slash && script !== DOUBLE_ESCAPED)
            pending = { start, name, closing: true }
          else
            script = slash ? ESCAPED : (script === ESCAPED ? DOUBLE_ESCAPED : script)
        }
      }
      else if (text) {
        if (slash && name === text)
          pending = { start, name, closing: true }
      }
      else if (comment) {
        if (token.startsWith('--'))
          comment = false
      }
      else if (token === '<!--') {
        comment = true
      }
      else if (tag) {
        pending = { start, name, closing: !!slash }
      }
      else if (token === '<') {
        const next = html[match.index! + 1]
        if (next === undefined)
          pending = { start, closing: false, unresolved: true }
        else if (MARKUP_START.test(next))
          pending = { start, closing: false }
      }
    }
    offset += chunk.length
    tail = html.slice(-TAIL_LENGTH)
    return script === OUTSIDE && !text && !comment && !pending
  }
}
