import { createStreamBodyScanner, scanTemplate } from '../parser/scanTemplate'

// Bound retention when a single construct spans an unbounded number of chunks.
const MAX_PENDING_HTML_LENGTH = 256 * 1024

export function prepareStreamShell(html: string): string {
  const scan = scanTemplate(html, false, false, 'shell')
  if (scan.canAppendAtEnd)
    return html
  if (scan.canOpenBodyAtEnd)
    return `${html}<body>`
  throw new Error('The stream outlet must be in HTML body content.')
}

export function canAppendStreamHtml(html: string): boolean {
  return createStreamBodyScanner()(html).canAppendAtEnd === true
}

export function createStreamBoundary() {
  const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
  const scan = createStreamBodyScanner()
  let atBoundary = true
  let pending: string | undefined = ''
  let verifyAt = 0

  function append(text: string) {
    if (pending === undefined)
      return
    pending += text
    if (pending.length < verifyAt)
      return
    const result = scan(pending)
    atBoundary = result.canAppendAtEnd === true
    pending = pending.slice(result.streamRestAt)
    if (pending.length >= MAX_PENDING_HTML_LENGTH) {
      pending = undefined
    }
    else {
      // Grow checks geometrically while waiting for a complete construct.
      verifyAt = Math.min(MAX_PENDING_HTML_LENGTH, pending.length * 2)
    }
  }

  return {
    write(chunk: Uint8Array): boolean {
      if (pending === undefined)
        return false
      try {
        append(decoder.decode(chunk, { stream: true }))
      }
      catch {
        pending = undefined
      }
      // A trailing greater-than sign cannot split UTF-8, CRLF or a character reference.
      return atBoundary && pending === '' && chunk.at(-1) === 0x3E
    },
    finish(): boolean {
      if (pending === undefined)
        return false
      try {
        verifyAt = 0
        append(decoder.decode())
        return atBoundary && pending === ''
      }
      catch {
        return false
      }
    },
  }
}
