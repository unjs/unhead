/**
 * Prototype: a Serializer backed by @vue/server-renderer + @vue/shared,
 * for the vue-consumer path where those bytes are already in the bundle.
 *
 * The glue below is the honest cost of the swap: v4 tag props are already
 * compiled (class is a Set, style is a Map, boolean coercion applied), so
 * vue's serializers need shape conversion before they can run.
 */
import type { Serializer } from './server-seam'
// escapeHtml is not re-exported from 'vue' or 'vue/server-renderer'; a real
// adapter would import from '@vue/shared' (always present in a vue app)
import { escapeHtml } from '@vue/shared'
import { ssrRenderAttrs } from 'vue/server-renderer'

/** convert v4 compiled prop shapes into what ssrRenderAttrs understands */
function toVueProps(props: Record<string, any>): Record<string, any> {
  let out: Record<string, any> | null = null
  for (const k in props) {
    const v = props[k]
    if (v instanceof Set) {
      (out ||= { ...props })[k] = [...v].join(' ')
    }
    else if (v instanceof Map) {
      const o: Record<string, string> = {};
      (out ||= { ...props })[k] = o
      for (const [a, b] of v) o[a] = b
    }
  }
  return out || props
}

export const vueSerializer: Serializer = {
  props: p => ssrRenderAttrs(toVueProps(p)),
  text: escapeHtml,
}
