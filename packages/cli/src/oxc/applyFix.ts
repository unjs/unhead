import type MagicString from 'magic-string'
import type { PredicateFix } from 'unhead/validate'
import { findProperty } from './materialize'

// oxc-parser AST is ESTree-shaped; loose typing avoids pulling the full
// oxc-parser type surface into the CLI runtime.
type Node = any

/**
 * Apply a {@link PredicateFix} to the file-level {@link MagicString}. `obj` is
 * the oxc object literal node the fix targets, with positions in *piece*
 * coordinates. `pieceOffset` is the UTF-16 character offset of the piece's start within
 * the original file source — added to every node position so the edit lands
 * in the right spot of `magic`.
 *
 * Returns true when the edit was applied, false when the targeted property
 * couldn't be located (defensive — should not happen for fixes a predicate
 * emitted from the same node).
 */
export function applyFix(
  magic: MagicString,
  obj: Node,
  fix: PredicateFix,
  pieceOffset: number,
  pieceCode: string,
): boolean {
  const off = pieceOffset
  switch (fix.type) {
    case 'rename-prop': {
      const prop = findProperty(obj, fix.key)
      if (!prop)
        return false
      magic.overwrite(prop.key.start + off, prop.key.end + off, fix.newKey)
      return true
    }
    case 'replace-prop-value': {
      const prop = findProperty(obj, fix.key)
      if (!prop)
        return false
      magic.overwrite(prop.value.start + off, prop.value.end + off, fix.newSource)
      return true
    }
    case 'replace-prop': {
      const prop = findProperty(obj, fix.key)
      if (!prop)
        return false
      magic.overwrite(prop.start + off, prop.end + off, fix.newSource)
      return true
    }
    case 'insert-after-prop': {
      const prop = findProperty(obj, fix.afterKey)
      if (!prop)
        return false
      magic.appendRight(prop.end + off, fix.insert)
      return true
    }
    case 'remove-prop': {
      const prop = findProperty(obj, fix.key)
      if (!prop)
        return false
      // Swallow a surrounding comma so we don't leave `{ , a: 1 }`.
      let from = prop.start
      let to = prop.end
      let f = to
      while (f < pieceCode.length && /\s/.test(pieceCode[f])) f++
      if (pieceCode[f] === ',') {
        to = f + 1
      }
      else {
        let b = from - 1
        while (b >= 0 && /\s/.test(pieceCode[b])) b--
        if (pieceCode[b] === ',')
          from = b
      }
      magic.remove(from + off, to + off)
      return true
    }
    case 'wrap-tag': {
      magic.appendLeft(obj.start + off, `${fix.wrapWith}(`)
      magic.appendRight(obj.end + off, `)`)
      return true
    }
  }
}
