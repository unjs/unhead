import type { HookFilter } from 'unplugin'

export const NODE_MODULES_RE = /[\\/]node_modules[\\/]/
export const JS_VUE_RE = /\.(?:(?:c|m)?j|t)sx?(?:$|\?)|\.vue(?:$|\?)/

export function createJsVueTransformIdFilter(include?: RegExp[]): HookFilter['id'] {
  return {
    include: [
      JS_VUE_RE,
      ...(include || []),
    ],
    exclude: NODE_MODULES_RE,
  }
}

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
