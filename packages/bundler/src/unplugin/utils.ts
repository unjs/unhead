import type { UnpluginOptions } from 'unplugin'

export function splitTransformId(id: string): { pathname: string, query: string } {
  const queryIndex = id.indexOf('?')
  return queryIndex === -1
    ? { pathname: id, query: '' }
    : { pathname: id.slice(0, queryIndex), query: id.slice(queryIndex + 1) }
}

export function getQueryValue(query: string, key: string): string | undefined {
  const keyLength = key.length
  let start = 0
  while (start < query.length) {
    const ampIndex = query.indexOf('&', start)
    const end = ampIndex === -1 ? query.length : ampIndex
    const eqIndex = query.indexOf('=', start)

    if (eqIndex === -1 || eqIndex > end) {
      if (end - start === keyLength && query.startsWith(key, start))
        return ''
    }
    else if (eqIndex - start === keyLength && query.startsWith(key, start)) {
      return query.slice(eqIndex + 1, end)
    }

    start = end + 1
  }
}

export function isVueScriptRequest(pathname: string, query: string): boolean {
  return pathname.endsWith('.vue') && (!query || getQueryValue(query, 'type') === 'script')
}

export function withCodeFilter(plugin: UnpluginOptions, code: RegExp): UnpluginOptions {
  if (typeof plugin.transform !== 'function')
    return plugin

  return {
    ...plugin,
    transform: {
      filter: { code },
      handler: plugin.transform,
    },
  }
}
