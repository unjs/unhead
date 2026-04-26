/**
 * Single `<script>` block extracted from a Vue / Svelte SFC. `lang` is the
 * declared script language (`'ts'`, `'tsx'`, `'js'`, …). `offset` is the
 * absolute character offset of the first character of `code` within the
 * original source (UTF-16 code units, matching both oxc-parser spans and
 * JavaScript string indexing). Used to translate oxc spans back to file-level
 * positions for diagnostics and MagicString edits.
 */
export interface ScriptBlock {
  code: string
  /** UTF-16 character offset of `code[0]` within the source file. */
  offset: number
  lang: 'ts' | 'tsx' | 'js' | 'jsx'
}

// Match `<script ...>` allowing `>` to appear inside quoted attribute values.
// Vue 3.3+ generic attributes (`generic="T extends Foo<Bar>"`) and any
// attribute carrying inequality / generic syntax would otherwise terminate
// the opener early and leave the script body unparsed.
const SCRIPT_OPEN_RE = /<script\b((?:"[^"]*"|'[^']*'|[^>])*)>/gi
const SCRIPT_CLOSE_RE = /<\/script\s*>/gi
const LANG_ATTR_RE = /\blang\s*=\s*['"]([^'"]+)['"]/i

/**
 * Extract every `<script>` block from a `.vue` / `.svelte` source. Multiple
 * blocks (e.g. classic + `<script setup>`) each become their own entry. We do
 * not attempt to honor `<template>`-only files specially: zero blocks → empty
 * array, audit walks nothing.
 */
export function extractScriptBlocks(source: string): ScriptBlock[] {
  const out: ScriptBlock[] = []
  SCRIPT_OPEN_RE.lastIndex = 0
  for (let m = SCRIPT_OPEN_RE.exec(source); m; m = SCRIPT_OPEN_RE.exec(source)) {
    const attrs = m[1]
    const openEnd = m.index + m[0].length
    SCRIPT_CLOSE_RE.lastIndex = openEnd
    const closeMatch = SCRIPT_CLOSE_RE.exec(source)
    if (!closeMatch)
      continue
    const code = source.slice(openEnd, closeMatch.index)
    const langMatch = attrs.match(LANG_ATTR_RE)
    const declared = langMatch?.[1]?.toLowerCase()
    const lang: ScriptBlock['lang'] = declared === 'ts'
      ? 'ts'
      : declared === 'tsx'
        ? 'tsx'
        : declared === 'jsx'
          ? 'jsx'
          : 'js'
    out.push({ code, offset: openEnd, lang })
    SCRIPT_OPEN_RE.lastIndex = closeMatch.index + closeMatch[0].length
  }
  return out
}

/**
 * Map a file extension to the oxc `lang` parser hint. Returns `undefined` for
 * extensions that aren't directly oxc-parsable (e.g. `.vue`) — caller should
 * extract script blocks first via {@link extractScriptBlocks}.
 */
export function langForExt(ext: string): ScriptBlock['lang'] | undefined {
  switch (ext) {
    case '.ts':
    case '.mts':
    case '.cts':
      return 'ts'
    case '.tsx':
      return 'tsx'
    case '.jsx':
      return 'jsx'
    case '.js':
    case '.mjs':
    case '.cjs':
      return 'js'
    default:
      return undefined
  }
}
