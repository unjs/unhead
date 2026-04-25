import type { LintFileResult, LintMessage, LintResponse } from '../types'
import { relative } from 'node:path'
import { defineRpcFunction } from '@vitejs/devtools-kit'

interface RunLintArgs {
  mode?: 'audit' | 'migrate'
}

async function tryRequire(): Promise<{ runLint: any } | null> {
  try {
    const mod = await import('@unhead/cli' as string)
    return { runLint: mod.runLint }
  }
  catch {
    return null
  }
}

// Explicit `any` annotation for the same TS2883 reason as get-config.
export const runLintRpc: any = defineRpcFunction({
  name: 'unhead:run-lint',
  type: 'static',
  setup: ctx => ({
    handler: async (args: RunLintArgs = {}): Promise<LintResponse> => {
      const lib = await tryRequire()
      if (!lib) {
        return {
          available: false,
          message: 'Install @unhead/cli (and eslint as a peer) to enable in-devtools auditing.',
        }
      }

      const start = Date.now()
      const mode = args.mode === 'migrate' ? 'migrate' : 'audit'
      const cwd = ctx.cwd

      const { results, errorCount, warningCount, fixableErrorCount, fixableWarningCount } = await lib.runLint({
        patterns: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,vue,svelte}'],
        mode,
        cwd,
        ignore: ['**/node_modules/**', '**/dist/**', '**/.output/**', '**/.nuxt/**'],
      })

      const files: LintFileResult[] = results.map((r: any) => ({
        filePath: r.filePath,
        relativePath: relative(cwd, r.filePath),
        errorCount: r.errorCount,
        warningCount: r.warningCount,
        fixableErrorCount: r.fixableErrorCount,
        fixableWarningCount: r.fixableWarningCount,
        fixed: typeof r.output === 'string',
        messages: (r.messages || []).map((m: any): LintMessage => ({
          ruleId: m.ruleId ?? null,
          message: m.message,
          severity: m.severity === 2 ? 'error' : 'warn',
          line: m.line,
          column: m.column,
          endLine: m.endLine,
          endColumn: m.endColumn,
          // Only `fix` is auto-applied by `--fix`; suggestions are editor-only.
          fixable: Boolean(m.fix),
        })),
      })).filter((f: LintFileResult) => f.errorCount > 0 || f.warningCount > 0 || f.fixed)

      const filesFixed = files.filter(f => f.fixed).length

      return {
        available: true,
        mode,
        files,
        errorCount,
        warningCount,
        fixableErrorCount,
        fixableWarningCount,
        filesFixed,
        durationMs: Date.now() - start,
      }
    },
  }),
})
