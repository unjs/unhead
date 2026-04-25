import type { ESLint as ESLintType, Linter } from 'eslint'
import unheadPlugin, { configs as unheadConfigs } from '@unhead/eslint-plugin'
import { ESLint } from 'eslint'

export type Mode = 'audit' | 'migrate'

export interface LintOptions {
  patterns: string[]
  mode: Mode
  cwd?: string
  ignore?: string[]
  /**
   * Whether to persist fixes to disk. Defaults to `mode === 'migrate'` so the
   * `migrate` command writes by default and `audit` never does. Pass `false`
   * with `mode: 'migrate'` for a dry-run that still computes fixes against the
   * full migration rule set.
   */
  write?: boolean
}

function buildConfig(mode: Mode, ignore: string[]): Linter.Config[] {
  const base: Linter.Config = {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,vue,svelte}'],
    plugins: { '@unhead': unheadPlugin },
    rules: (mode === 'migrate' ? unheadConfigs.migration : unheadConfigs.recommended).rules,
  }
  return ignore.length ? [{ ignores: ignore }, base] : [base]
}

export async function runLint({ patterns, mode, cwd, ignore = [], write }: LintOptions): Promise<{
  results: ESLintType.LintResult[]
  errorCount: number
  warningCount: number
  fixableErrorCount: number
  fixableWarningCount: number
}> {
  const shouldWrite = write ?? (mode === 'migrate')
  const eslint = new ESLint({
    cwd,
    overrideConfigFile: true,
    overrideConfig: buildConfig(mode, ignore),
    fix: mode === 'migrate',
  })

  const results = await eslint.lintFiles(patterns)

  if (shouldWrite)
    await ESLint.outputFixes(results)

  let errorCount = 0
  let warningCount = 0
  let fixableErrorCount = 0
  let fixableWarningCount = 0
  for (const r of results) {
    errorCount += r.errorCount
    warningCount += r.warningCount
    fixableErrorCount += r.fixableErrorCount
    fixableWarningCount += r.fixableWarningCount
  }

  return { results, errorCount, warningCount, fixableErrorCount, fixableWarningCount }
}

export async function formatResults(results: ESLintType.LintResult[]): Promise<string> {
  const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: [] })
  const formatter = await eslint.loadFormatter('stylish')
  return formatter.format(results)
}
