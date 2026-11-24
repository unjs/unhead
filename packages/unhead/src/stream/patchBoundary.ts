// Tokens that start or end script content, text elements and comments.
const TOKEN_RE = /<!--|--!?>|<(\/?)(script|iframe|noembed|noframes|noscript|style|textarea|title|xmp)(?=[\t\n\f\r />])/gi
// The longest token plus its lookahead character.
const TAIL_LENGTH = 11

const OUTSIDE = 0
const DATA = 1
const ESCAPED = 2
const DOUBLE_ESCAPED = 3

/**
 * Track whether streamed app HTML ends where a late head patch can go.
 *
 * A patch is an inline script, and its end tag would close an app script early. Script
 * tracking reads every `<script` token in any context, so a `<script` inside an
 * attribute or text only delays the patch. Patches carry no quotes, so other contexts
 * keep them inert. Waiting inside text elements and comments keeps the patch out of
 * visible text.
 *
 * Returns `true` when the HTML so far ends outside those contexts.
 */
export function createPatchBoundary(): (text: string) => boolean {
  let tail = ''
  let script = OUTSIDE
  let text: string | undefined
  let comment = false
  return (chunk) => {
    const html = tail + chunk
    for (const match of html.matchAll(TOKEN_RE)) {
      const [token, slash, tag] = match
      // The previous call read every token that ended inside the tail, including its lookahead.
      if (match.index! + token.length + (tag ? 1 : 0) <= tail.length)
        continue
      const name = tag?.toLowerCase()
      if (script !== OUTSIDE) {
        if (!tag)
          script = token === '<!--' ? (script === DATA ? ESCAPED : script) : (token === '-->' && script > DATA ? DATA : script)
        else if (name === 'script')
          script = slash ? (script === DOUBLE_ESCAPED ? ESCAPED : OUTSIDE) : (script === ESCAPED ? DOUBLE_ESCAPED : script)
      }
      else if (name === 'script') {
        if (!slash)
          script = DATA
      }
      else if (text) {
        if (slash && name === text)
          text = undefined
      }
      else if (comment) {
        comment = !token.startsWith('--')
      }
      else if (tag) {
        if (!slash)
          text = name
      }
      else {
        comment = token === '<!--'
      }
    }
    tail = html.slice(-TAIL_LENGTH)
    return script === OUTSIDE && !text && !comment
  }
}
