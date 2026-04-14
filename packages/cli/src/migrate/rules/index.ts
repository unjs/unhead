import type { Rule, RuleId } from '../types'
import { propRenameRules } from './prop-renames'

export const allRules: Rule[] = [
  ...propRenameRules,
]

export const allRuleIds: RuleId[] = allRules.map(r => r.id)

export interface RuleFilter {
  include?: RuleId[]
  exclude?: RuleId[]
}

export function selectRules(filter: RuleFilter = {}): Rule[] {
  const { include, exclude } = filter
  return allRules.filter((r) => {
    if (include && !include.includes(r.id))
      return false
    if (exclude?.includes(r.id))
      return false
    return true
  })
}
