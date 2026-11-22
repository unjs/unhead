import type { TemplateParams } from '../types'

const LT_RE = /</g
const TOKEN_RE = /%\w+(?:\.\w+)?/g
// decodeURI throws on a `%` that two hex digits do not follow, so skip the call for those strings
const LONE_PERCENT_RE = /%(?![0-9a-f]{2})/i

const SepSub = '%separator'

// for each %<word> token replace it with the corresponding runtime config or an empty value
function sub(p: TemplateParams, token: string, isJson?: boolean): string | undefined {
  // TOKEN_RE allows one `.`, for a nested param such as %site.name
  const dot = token.indexOf('.')
  const val = (token === 's' || token === 'pageTitle')
    ? p.pageTitle
    : dot === -1
      ? p[token]
      : (p[token.slice(0, dot)] as Record<string, unknown> | undefined)?.[token.slice(dot + 1)]
  if (val === undefined)
    return
  // numbers are kept, including 0, while null and false still render as empty
  const str = String(typeof val === 'number' ? val : val || '')
  return isJson
    ? JSON.stringify(str).slice(1, -1).replace(LT_RE, '\\u003C')
    : str
}

export function processTemplateParams(s: string, p: TemplateParams, sep?: string, isJson?: boolean) {
  // return early
  if (typeof s !== 'string' || !s.includes('%'))
    return s
  // need to avoid replacing url encoded values
  let decoded = s
  if (!LONE_PERCENT_RE.test(s)) {
    try {
      decoded = decodeURI(s)
    }
    catch {
      // Malformed encoded input should fall back to token matching against the original string.
    }
  }
  // Only decoding can change which tokens are eligible for replacement.
  const tokens = decoded === s ? undefined : decoded.match(TOKEN_RE)
  if (tokens === null)
    return s

  let hasTokens = tokens !== undefined
  const replaced = s.replace(TOKEN_RE, (token) => {
    hasTokens = true
    if (token === SepSub || (tokens && !tokens.includes(token))) {
      return token
    }

    return sub(p, token.slice(1), isJson) ?? token
  })
  if (!hasTokens)
    return s
  const rendered = replaced.trim()

  // we wait to transform the separator as we need to transform all other tokens first
  // we need to remove separators if they're next to each other or if they're at the start or end of the string
  // for example: %separator %separator %title should return %title
  if (s.includes(SepSub)) {
    return rendered.split(SepSub)
      .map(part => part.trim())
      .filter(Boolean)
      .join(sep ? ` ${sep} ` : ' ')
  }
  return rendered
}
