import type { RuleSeverity, ValidationRuleId } from 'unhead/validate'
import { VALIDATION_RULE_IDS } from 'unhead/validate'

/**
 * View-side overrides for rule severity. Persisted to localStorage so the
 * preference survives reloads. We deliberately don't round-trip to the
 * runtime ValidatePlugin: filtering at the view layer is enough to silence
 * noisy rules without requiring a config change in the user's app.
 */

const STORAGE_KEY = 'unhead:rule-severity-overrides'

type OverrideMap = Partial<Record<ValidationRuleId, RuleSeverity>>

function readStorage(): OverrideMap {
  if (typeof window === 'undefined')
    return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw)
      return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object')
      return {}
    return parsed as OverrideMap
  }
  catch {
    return {}
  }
}

function writeStorage(map: OverrideMap): void {
  if (typeof window === 'undefined')
    return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  }
  catch {}
}

const overrides = ref<OverrideMap>(readStorage())

watch(overrides, v => writeStorage(v), { deep: true })

export function useRuleOverrides() {
  return {
    overrides,
    knownRuleIds: VALIDATION_RULE_IDS,
    set(id: ValidationRuleId, severity: RuleSeverity | null) {
      const next = { ...overrides.value }
      if (severity == null)
        delete next[id]
      else
        next[id] = severity
      overrides.value = next
    },
    get(id: ValidationRuleId): RuleSeverity | undefined {
      return overrides.value[id]
    },
    reset() {
      overrides.value = {}
    },
  }
}

/**
 * Apply view-side overrides to a list of validation rules. Rules whose
 * override is `'off'` are dropped; otherwise the override (when present)
 * replaces the runtime severity.
 */
export function applyOverrides<T extends { id: string, severity: 'warn' | 'info' }>(
  rules: T[],
  map: OverrideMap,
): T[] {
  if (Object.keys(map).length === 0)
    return rules
  const out: T[] = []
  for (const rule of rules) {
    const override = map[rule.id as ValidationRuleId]
    if (override === 'off')
      continue
    if (override === 'warn' || override === 'info')
      out.push({ ...rule, severity: override })
    else
      out.push(rule)
  }
  return out
}
