import type { CompiledTags } from './types'

/** The dedupe key came from v3 `_d`, not from `hashTag`. */
export const FLAG_IDENTITY = 1
/** v3 `isMetaArrayDupeKey` holds, so one entry may repeat this meta. */
export const FLAG_ARRAYABLE = 2
/** A string value of this tag holds a dynamic value. */
export const FLAG_DYNAMIC_VALUES = 4

export const DYNAMIC_VALUE_OPEN = '\uE000'
export const DYNAMIC_VALUE_CLOSE = '\uE001'
export const DYNAMIC_VALUE_RE = /\uE000(\d+)\uE001/g
const WHOLE_DYNAMIC_VALUE_RE = /^\uE000(\d+)\uE001$/

/**
 * The token that marks dynamic value `index` inside a string value of `compileTags` input.
 *
 * @experimental
 */
export function dynamicValue(index: number): string {
  return `${DYNAMIC_VALUE_OPEN}${index}${DYNAMIC_VALUE_CLOSE}`
}

/**
 * Replaces the dynamic values of a value. A value that is only a dynamic value keeps the raw value,
 * so `normalizeProps` sees what the author passed.
 */
export function resolveDynamicValues(value: string, values?: readonly unknown[]): unknown {
  const whole = WHOLE_DYNAMIC_VALUE_RE.exec(value)
  return whole
    ? values?.[+whole[1]!]
    : value.replace(DYNAMIC_VALUE_RE, (_, index) => String(values?.[+index]))
}

/**
 * Rebuilds loose head input from compiled tags. `normalizeEntryToTags` over the result
 * gives the tags the runtime makes for the original input.
 *
 * @experimental
 */
export function toHeadInput(compiledTags: CompiledTags, values?: readonly unknown[]): Record<string, any> {
  const input: Record<string, any> = {}
  for (const [tag, props, , , extra, flags] of compiledTags) {
    let value: any = { ...(props || undefined), ...(extra || undefined) }
    if (flags! & FLAG_DYNAMIC_VALUES) {
      for (const key in value) {
        if (typeof value[key] === 'string')
          value[key] = resolveDynamicValues(value[key], values)
      }
    }
    // normalize adds this one last, so an attribute a value adds must land before it
    if (value['data-hid'] === value.key)
      delete value['data-hid']
    // `title: null` and `title: { textContent: null }` differ, so keep the shorthand
    if ((tag === 'title' || tag === 'titleTemplate') && !props && extra && 'textContent' in extra && Object.keys(extra).length === 1)
      value = value.textContent
    const current = input[tag]
    if (current === undefined)
      input[tag] = tag === 'meta' || tag === 'link' || tag === 'script' || tag === 'style' || tag === 'noscript' ? [value] : value
    else if (Array.isArray(current))
      current.push(value)
    else
      input[tag] = [current, value]
  }
  return input
}
