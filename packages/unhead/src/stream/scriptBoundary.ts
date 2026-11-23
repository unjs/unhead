// Tokens that move the HTML tokenizer into or out of script content.
const SCRIPT_TOKEN_RE = /<!--|-->|<(\/?)script(?=[\t\n\f\r />])/gi
// The longest token plus its lookahead character.
const TAIL_LENGTH = 9

const OUTSIDE = 0
const DATA = 1
const ESCAPED = 2
const DOUBLE_ESCAPED = 3

/**
 * Track whether streamed app HTML ends inside script content.
 *
 * A late head patch is an inline script, and its end tag would close an app script early.
 * Patches carry no quotes, so other contexts keep them inert. A `<script` inside an
 * attribute or a comment also counts as an open script, which only delays the patch.
 *
 * Returns `true` when the HTML so far ends outside script content.
 */
export function createScriptTracker(): (text: string) => boolean {
  let tail = ''
  let state = OUTSIDE
  return (text) => {
    const html = tail + text
    for (const match of html.matchAll(SCRIPT_TOKEN_RE)) {
      const tag = match[1]
      // The previous call read every token that ended inside the tail, including its lookahead.
      if (match.index! + match[0].length + (tag === undefined ? 0 : 1) <= tail.length)
        continue
      if (tag === undefined) {
        if (match[0] === '<!--')
          state = state === DATA ? ESCAPED : state
        else if (state > DATA)
          state = DATA
      }
      else if (tag) {
        state = state === DOUBLE_ESCAPED ? ESCAPED : OUTSIDE
      }
      else {
        state = state === OUTSIDE ? DATA : state === ESCAPED ? DOUBLE_ESCAPED : state
      }
    }
    tail = html.slice(-TAIL_LENGTH)
    return state === OUTSIDE
  }
}
