const hasOwnProperty = Object.prototype.hasOwnProperty

export function hasOwn(object: object, key: PropertyKey): boolean {
  return hasOwnProperty.call(object, key)
}
