export function maybeGetSSRHash(document: Document) {
  return document?.head.querySelector('meta[name="unhead:ssr"]')?.getAttribute('content') || false
}
