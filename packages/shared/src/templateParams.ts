import type { TemplateParams } from '@unhead/schema'

const sepSub = '%separator'

// for each %<word> token replace it with the corresponding runtime config or an empty value
function sub(p: TemplateParams, token: string) {
  let val: string | undefined
  if (token === 's' || token === 'pageTitle') {
    val = p.pageTitle as string
  }
  // support . notation
  else if (token.includes('.')) {
    // @ts-expect-error untyped
    val = token.split('.').reduce((acc, key) => acc ? (acc[key] || undefined) : undefined, p) as string
  }
  else { val = p[token] as string | undefined }
  return val !== undefined
    // need to escape val for json
    ? (val || '').replace(/"/g, '\\"')
    : false
}

export function processTemplateParams(s: string, p: TemplateParams, sep: string) {
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
  const tokens: string[] = (decoded.match(/%(\w+\.+\w+)|%(\w+)/g) || []).sort().reverse()
  // for each tokens, replace in the original string s
  tokens.forEach((token) => {
    const re = sub(p, token.slice(1))
    if (typeof re === 'string') {
      // replace the re using regex as word separators
      s = s.replace(new RegExp(`\\${token}(\\W|$)`, 'g'), (_, args) => `${re}${args}`).trim()
    }
  })

  // we wait to transform the separator as we need to transform all other tokens first
  // we need to remove separators if they're next to each other or if they're at the start or end of the string
  // for example: %separator %separator %title should return %title
  if (s.includes(sepSub)) {
    if (s.endsWith(sepSub))
      s = s.slice(0, -sepSub.length).trim()
    if (s.startsWith(sepSub))
      s = s.slice(sepSub.length).trim()
    // make sure we don't have two separators next to each other
    s = s.replace(new RegExp(`\\${sepSub}\\s*\\${sepSub}`, 'g'), sepSub)
    s = processTemplateParams(s, { separator: sep }, sep)
  }
  return s
}
