import type { AuditFileResult } from '../src/oxc/audit'
import { describe, expect, it } from 'vitest'
import { analyzeTitleConsistency } from '../src/oxc/title-consistency'

function fileWithTitle(filePath: string, value: string): AuditFileResult {
  return {
    filePath,
    diagnostics: [],
    headCalls: [],
    titles: [{ value, line: 1, column: 1, callee: 'useHead' }],
    titleTemplates: [],
  }
}

function fileWithTemplate(filePath: string, value: string): AuditFileResult {
  return {
    filePath,
    diagnostics: [],
    headCalls: [],
    titles: [],
    titleTemplates: [{ value, line: 1, column: 1, callee: 'defineNuxtConfig' }],
  }
}

describe('analyzeTitleConsistency', () => {
  it('returns empty for fewer than two titles', () => {
    expect(analyzeTitleConsistency([fileWithTitle('a.vue', 'Solo')])).toEqual([])
  })

  it('flags mixed separators across the project', () => {
    const findings = analyzeTitleConsistency([
      fileWithTitle('a.vue', 'Home | My Site'),
      fileWithTitle('b.vue', 'About - My Site'),
      fileWithTitle('c.vue', 'Pricing | My Site'),
    ])
    const sep = findings.find(f => f.kind === 'separator')
    expect(sep).toBeDefined()
    expect(sep!.message).toContain('different title separators')
    expect(sep!.hint).toContain('templateParams')
    expect(sep!.hint).toContain('titleTemplate')
  })

  it('does not flag separator inconsistency when only one separator is used', () => {
    const findings = analyzeTitleConsistency([
      fileWithTitle('a.vue', 'Home | My Site'),
      fileWithTitle('b.vue', 'About | My Site'),
      fileWithTitle('c.vue', 'Pricing | My Site'),
    ])
    expect(findings.find(f => f.kind === 'separator')).toBeUndefined()
  })

  it('suggests titleTemplate when most titles share a suffix', () => {
    const findings = analyzeTitleConsistency([
      fileWithTitle('a.vue', 'Home | My Site'),
      fileWithTitle('b.vue', 'About | My Site'),
      fileWithTitle('c.vue', 'Pricing | My Site'),
      fileWithTitle('d.vue', 'Standalone Page'),
    ])
    const suffix = findings.find(f => f.kind === 'common-suffix')
    expect(suffix).toBeDefined()
    expect(suffix!.message).toContain('My Site')
    expect(suffix!.hint).toContain('titleTemplate')
    expect(suffix!.hint).toContain('templateParams')
  })

  it('warns about duplicated suffix when titleTemplate is already set', () => {
    const findings = analyzeTitleConsistency([
      fileWithTemplate('nuxt.config.ts', '%s · My Site'),
      fileWithTitle('a.vue', 'Home | My Site'),
      fileWithTitle('b.vue', 'About | My Site'),
      fileWithTitle('c.vue', 'Pricing | My Site'),
    ])
    const redundant = findings.find(f => f.kind === 'redundant-suffix')
    expect(redundant).toBeDefined()
    expect(redundant!.hint).toContain('already set')
    expect(redundant!.hint).toContain('twice')
  })

  it('flags mixing literal titles with template-param titles', () => {
    const findings = analyzeTitleConsistency([
      fileWithTitle('a.vue', '%s · %siteName'),
      fileWithTitle('b.vue', 'About'),
      fileWithTitle('c.vue', 'Pricing'),
    ])
    const mix = findings.find(f => f.kind === 'literal-mixed-with-template')
    expect(mix).toBeDefined()
    expect(mix!.message).toContain('template params')
  })

  it('ignores titles with template params when computing common suffix', () => {
    // Templated titles already use the unhead pattern; they shouldn't be
    // counted as having a literal suffix that needs extraction.
    const findings = analyzeTitleConsistency([
      fileWithTitle('a.vue', '%s · %siteName'),
      fileWithTitle('b.vue', '%s · %siteName'),
      fileWithTitle('c.vue', '%s · %siteName'),
    ])
    expect(findings.find(f => f.kind === 'common-suffix' || f.kind === 'redundant-suffix')).toBeUndefined()
  })
})
