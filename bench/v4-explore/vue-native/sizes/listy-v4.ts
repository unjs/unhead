// candidate 1 micro-measure: v4's normListy walker, standalone
export function normListy(value: any, isStyle: boolean): any {
  const store: any = isStyle ? new Map() : new Set()
  const add = (v: string) => {
    if (!v)
      return
    if (isStyle) {
      const i = v.indexOf(':')
      i > 0 && store.set(v.slice(0, i).trim(), v.slice(i + 1).trim())
    }
    else {
      for (const c of v.split(' ')) c && store.add(c)
    }
  }
  if (typeof value === 'string') {
    isStyle ? value.split(';').forEach(add) : add(value)
  }
  else if (Array.isArray(value)) {
    value.forEach(add)
  }
  else if (value && typeof value === 'object') {
    for (const k in value) value[k] && (isStyle ? store.set(k.trim(), String(value[k])) : add(k))
  }
  return store
}
