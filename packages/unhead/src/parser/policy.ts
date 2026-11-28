import type { HeadTag } from '../types'
import { dedupeKey } from '../utils/dedupe'

export const CSP_DIRECTIVE = 'content-security-policy'

export interface PolicySlot {
  readonly identity: string
  readonly start: number
  readonly end: number
}

export function policyIdentity(tag: HeadTag): string | undefined {
  const { props } = tag
  const pragma = props['http-equiv']
  if (tag.tag !== 'meta' || typeof pragma !== 'string' || pragma.toLowerCase() !== CSP_DIRECTIVE)
    return
  if (props.charset !== undefined || props.name !== undefined || props.property !== undefined)
    return
  return dedupeKey(pragma === CSP_DIRECTIVE ? tag : { ...tag, props: { ...props, 'http-equiv': CSP_DIRECTIVE } })
}

interface HeadMarkup { headTags: string }

let renderedPolicies: WeakMap<HeadMarkup, { headTags: string, slots: PolicySlot[] }> | undefined

export function rememberRenderedPolicies(output: HeadMarkup, slots: PolicySlot[]) {
  ;(renderedPolicies ||= new WeakMap()).set(output, { headTags: output.headTags, slots })
}

export function findRenderedPolicy(output: HeadMarkup, identity: string): PolicySlot | undefined {
  const rendered = renderedPolicies?.get(output)
  // A renderer hook can return different markup from the tags we serialized.
  if (!rendered || rendered.headTags !== output.headTags)
    return
  let match: PolicySlot | undefined
  for (const slot of rendered.slots) {
    if (slot.identity !== identity)
      continue
    if (match)
      return
    match = slot
  }
  return match
}
