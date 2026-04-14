import type { ReportEntry, RuleId } from './types'

export interface MigrationReport {
  files: number
  filesChanged: number
  entries: ReportEntry[]
  add: (entry: ReportEntry) => void
  countBy: (ruleId: RuleId) => number
}

export function createReport(): MigrationReport {
  const entries: ReportEntry[] = []
  return {
    files: 0,
    filesChanged: 0,
    entries,
    add(entry) {
      entries.push(entry)
    },
    countBy(ruleId) {
      let n = 0
      for (const e of entries) {
        if (e.ruleId === ruleId)
          n++
      }
      return n
    },
  }
}
