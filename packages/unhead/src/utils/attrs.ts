// Attribute names are emitted verbatim by HTML renderers. Reject characters
// that can terminate or reshape an attribute in HTML syntax.
// eslint-disable-next-line no-control-regex
const INVALID_ATTR_NAME_RE = /[\s"'<>/=\x00-\x1F\x7F]/

export function isValidAttributeName(name: string): boolean {
  return name !== '' && !INVALID_ATTR_NAME_RE.test(name)
}
