import type { TemplateParams } from '@unhead/schema'

export function processTemplateParams(s: string, p: TemplateParams) {
  if (typeof s !== 'string')
    return s
  // for each %<word> token replace it with the corresponding runtime config or an empty value
  function sub(token: string) {
    if (['s', 'pageTitle'].includes(token))
      return p.pageTitle as string
    let val: string | undefined
    // support . notation
    if (token.includes('.')) {
      // @ts-expect-error untyped
      val = token.split('.').reduce((acc, key) => acc ? (acc[key] || undefined) : undefined, p) as string
    }
    else { val = p[token] as string | undefined }
    return typeof val !== 'undefined' ? (val || '') : false
  }

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
    const re = sub(token.slice(1))
    if (typeof re === 'string') {
      // replace the re using regex as word seperators
      s = s.replace(new RegExp(`\\${token}(\\W|$)`, 'g'), (_, args) => `${re}${args}`).trim()
    }
  })

  // avoid dangling separators
  const sep = p.separator!
  if (s.includes(sep)) {
    if (s.endsWith(sep))
      s = s.slice(0, -sep.length).trim()
    if (s.startsWith(sep))
      s = s.slice(sep.length).trim()
    // make sure we don't have two separators next to each other
    s = s.replace(new RegExp(`\\${sep}\\s*\\${sep}`, 'g'), sep)
  }
  return s
}
