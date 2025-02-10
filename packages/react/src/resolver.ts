export function ReactPropResolver(_, value) {
  if (typeof value === 'object' && 'current' in value) {
    return value.current
  }
}
