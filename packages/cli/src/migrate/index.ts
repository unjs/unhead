import type { MigrationReport } from './report'
import type { RuleFilter } from './rules'
import type { Framework, ReportEntry, Rule } from './types'
import { readFile, writeFile } from 'node:fs/promises'
import process from 'node:process'
import MagicString from 'magic-string'
import { relative, resolve } from 'pathe'
import { glob } from 'tinyglobby'
import { createLocationResolver } from './location'
import { parseAndDispatch } from './parser'
import { createReport } from './report'
import { allRuleIds, selectRules } from './rules'

export type { MigrationReport, ReportEntry, Rule, RuleFilter }
export { allRuleIds, selectRules }

export interface MigrateOptions {
  /** One or more paths (files or directories). Directories are globbed for .ts/.tsx/.js/.jsx/.mts/.mjs/.cts/.cjs/.vue. */
  paths: string[]
  /** Project root used to resolve paths and print relative diagnostics. */
  cwd?: string
  /** Filter rule set. */
  rules?: RuleFilter
  /** When true, do not write files. */
  dry?: boolean
  /** Framework hint; if not supplied, parser stays framework-agnostic. */
  framework?: Framework
  /** Override the default include glob. */
  include?: string[]
  /** Extra globs to exclude. */
  exclude?: string[]
}

const DEFAULT_INCLUDE = ['**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs,vue}']
const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.nuxt/**',
  '**/.output/**',
  '**/.turbo/**',
  '**/.next/**',
  '**/.svelte-kit/**',
]

export async function migrate(options: MigrateOptions): Promise<MigrationReport> {
  const cwd = resolve(options.cwd ?? process.cwd())
  const files = await resolveFiles(options, cwd)
  const rules = selectRules(options.rules)
  const report = createReport()
  report.files = files.length

  for (const file of files) {
    const changed = await migrateFile(file, rules, report, options, cwd)
    if (changed)
      report.filesChanged++
  }

  return report
}

async function resolveFiles(options: MigrateOptions, cwd: string): Promise<string[]> {
  const include = options.include ?? DEFAULT_INCLUDE
  const exclude = [...DEFAULT_EXCLUDE, ...(options.exclude ?? [])]

  const results = new Set<string>()
  for (const input of options.paths) {
    const absolute = resolve(cwd, input)
    // Treat as glob or directory.
    const matches = await glob(include, {
      cwd: absolute,
      absolute: true,
      ignore: exclude,
      onlyFiles: true,
    }).catch(() => [] as string[])

    if (matches.length) {
      for (const m of matches) results.add(m)
    }
    else {
      // Assume single file input.
      results.add(absolute)
    }
  }
  return [...results].sort()
}

async function migrateFile(
  file: string,
  rules: Rule[],
  report: MigrationReport,
  options: MigrateOptions,
  cwd: string,
): Promise<boolean> {
  const code = await readFile(file, 'utf8').catch(() => null)
  if (code == null)
    return false

  // Cheap filter: if the file doesn't mention any of the trigger tokens, skip.
  if (!mentionsUnhead(code))
    return false

  const s = new MagicString(code)
  const relativePath = relative(cwd, file)
  const resolveLocation = createLocationResolver(code)
  const ctx = {
    file,
    code,
    s,
    resolveLocation,
    framework: options.framework ?? 'unknown' as Framework,
    report(entry: Omit<ReportEntry, 'file'>): void {
      report.add({ ...entry, file: relativePath })
    },
  }

  parseAndDispatch({ rules, ctx })

  if (!s.hasChanged())
    return false

  if (!options.dry)
    await writeFile(file, s.toString(), 'utf8')

  return true
}

const TRIGGER_TOKENS = [
  'useHead',
  'useSeoMeta',
  'useServerHead',
  'useServerSeoMeta',
  'useHeadSafe',
  'useServerHeadSafe',
  'createHead',
  'createServerHead',
  'createHeadCore',
  'createUnhead',
  '@unhead/',
  'from \'unhead',
  'from "unhead',
]

function mentionsUnhead(code: string): boolean {
  for (const t of TRIGGER_TOKENS) {
    if (code.includes(t))
      return true
  }
  return false
}
