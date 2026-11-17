import type { LintFileResult, LintMessage, LintResponse } from '../types'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { relative } from 'node:path'
import { defineRpcFunction } from '@vitejs/devtools-kit'

interface RunLintArgs {
  mode?: 'audit' | 'migrate'
  /** With `migrate`: report the files that would change without writing them. */
  dryRun?: boolean
  /**
   * With `migrate`: write only these absolute paths. The panel passes the files
   * the user confirmed from the dry run, so a file that changed since then is left alone.
   */
  files?: { filePath: string, fingerprint: string }[]
}

const PATTERNS = ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,vue,svelte}']
const IGNORE = ['**/node_modules/**', '**/dist/**', '**/.output/**', '**/.nuxt/**']
const SEVERITY: Record<string, LintMessage['severity']> = { error: 'error', warning: 'warn', info: 'info' }

async function loadCli(): Promise<{ runAudit: (opts: any) => Promise<any[]> } | null> {
  const mod = await import('@unhead/cli' as string).catch(() => {
    // @unhead/cli is an optional peer dependency; without it the Audit tab shows an install hint.
    return null
  })
  return typeof mod?.runAudit === 'function' ? mod : null
}

// Explicit `any` annotation for the same TS2883 reason as get-config.
export const runLintRpc: any = defineRpcFunction({
  name: 'run-lint',
  // Each run reads the current files, and `migrate` rewrites them, so never cache it.
  type: 'action',
  setup: ctx => ({
    handler: async (args: RunLintArgs = {}): Promise<LintResponse> => {
      const cli = await loadCli()
      if (!cli) {
        return {
          available: false,
          message: 'Install or update @unhead/cli to audit your source files.',
        }
      }

      const start = Date.now()
      const mode = args.mode === 'migrate' ? 'migrate' : 'audit'
      const dryRun = mode === 'migrate' && args.dryRun === true
      const cwd = ctx.cwd
      const results = await cli.runAudit({ patterns: PATTERNS, mode, cwd, ignore: IGNORE })

      const allowed = args.files ? new Map(args.files.map(file => [file.filePath, file.fingerprint])) : undefined
      const files: LintFileResult[] = []
      for (const r of results) {
        const fingerprint = typeof r.output === 'string'
          ? createHash('sha256').update(await readFile(r.filePath)).update(r.output).digest('hex')
          : undefined
        const fixed = typeof r.output === 'string' && (!allowed || allowed.get(r.filePath) === fingerprint)
        if (fixed && mode === 'migrate' && !dryRun)
          await writeFile(r.filePath, r.output)
        const messages: LintMessage[] = r.diagnostics.map((d: any): LintMessage => ({
          ruleId: d.ruleId ?? null,
          message: d.message,
          severity: SEVERITY[d.severity] ?? 'info',
          line: d.line,
          column: d.column,
        }))
        if (!messages.length && !fixed)
          continue
        files.push({
          filePath: r.filePath,
          relativePath: relative(cwd, r.filePath),
          errorCount: messages.filter(m => m.severity === 'error').length,
          warningCount: messages.filter(m => m.severity === 'warn').length,
          messages,
          fixed,
          fingerprint,
        })
      }

      return {
        available: true,
        mode,
        dryRun,
        files,
        errorCount: files.reduce((n, f) => n + f.errorCount, 0),
        warningCount: files.reduce((n, f) => n + f.warningCount, 0),
        filesFixed: files.filter(f => f.fixed).length,
        durationMs: Date.now() - start,
      }
    },
  }),
})
