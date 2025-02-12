import type { TemplateParams } from 'unhead/types'

const sepSub = '%separator'

// for each %<word> token replace it with the corresponding runtime config or an empty value
function sub(p: TemplateParams, token: string, isJson = false) {
  let val: string | undefined
  if (token === 's' || token === 'pageTitle') {
    val = p.pageTitle as string
  }
  // support . notation
  else if (token.includes('.')) {
    const dotIndex = token.indexOf('.')
    // @ts-expect-error untyped
    val = p[token.substring(0, dotIndex)]?.[token.substring(dotIndex + 1)]
  }
  else { val = p[token] as string | undefined }
  if (val !== undefined) {
    return isJson ? (val || '').replace(/"/g, '\\"') : val || ''
  }
  return undefined
}

const sepSubRe = new RegExp(`${sepSub}(?:\\s*${sepSub})*`, 'g')

export function processTemplateParams(s: string, p: TemplateParams, sep: string, isJson = false) {
  // return early
  if (typeof s !== 'string' || !s.includes('%'))
    return s
  // need to avoid replacing url encoded values
  let decoded = s
  try {
    decoded = decodeURI(s)
  }
  catch {}
  // find all tokens in decoded
  const tokens = decoded.match(/%\w+(?:\.\w+)?/g)

  if (!tokens) {
    return s
  }

  const hasSepSub = s.includes(sepSub)

  s = s.replace(/%\w+(?:\.\w+)?/g, (token) => {
    if (token === sepSub || !tokens.includes(token)) {
      return token
    }

    const re = sub(p, token.slice(1), isJson)
    return re !== undefined
      ? re
      : token
  }).trim()

  // we wait to transform the separator as we need to transform all other tokens first
  // we need to remove separators if they're next to each other or if they're at the start or end of the string
  // for example: %separator %separator %title should return %title
  if (hasSepSub) {
    if (s.endsWith(sepSub))
      s = s.slice(0, -sepSub.length)
    if (s.startsWith(sepSub))
      s = s.slice(sepSub.length)
    // make sure we don't have two separators next to each other
    s = s.replace(sepSubRe, sep).trim()
  }
  return s
}
