import type { RuleId } from './migrate/types'
import process from 'node:process'
import { defineCommand, runMain } from 'citty'
import { migrate } from './migrate'
import { allRuleIds } from './migrate/rules'

const migrateCommand = defineCommand({
  meta: {
    name: 'migrate',
    description: 'Run the Unhead v2 → v3 codemod against your project.',
  },
  args: {
    paths: {
      type: 'positional',
      description: 'Files or directories to migrate (default: cwd).',
      required: false,
    },
    dry: {
      type: 'boolean',
      description: 'Print would-be changes without writing.',
      default: false,
    },
    check: {
      type: 'boolean',
      description: 'Exit with code 1 if changes are needed (implies --dry).',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'Emit a machine-readable JSON report on stdout.',
      default: false,
    },
    rules: {
      type: 'string',
      description: 'Comma-separated rule IDs to include. Prefix with ! to exclude.',
    },
    framework: {
      type: 'string',
      description: 'Framework hint: vue | react | svelte | solid | angular.',
    },
  },
  async run({ args }) {
    const rawPaths = Array.isArray(args.paths) ? args.paths : (args.paths ? [args.paths] : [])
    const paths = rawPaths.length ? rawPaths : ['.']
    const rules = parseRuleFilter(args.rules)
    const dry = args.dry || args.check

    const report = await migrate({
      paths,
      dry,
      rules,
      framework: args.framework as any,
    })

    if (args.json) {
      process.stdout.write(`${JSON.stringify({
        files: report.files,
        filesChanged: report.filesChanged,
        entries: report.entries,
      }, null, 2)}\n`)
    }
    else {
      printHumanReport(report, { dry, check: args.check })
    }

    if (args.check && report.filesChanged > 0)
      process.exit(1)
  },
})

const mainCommand = defineCommand({
  meta: {
    name: 'unhead',
    description: 'Unhead CLI: migration codemods for major version upgrades.',
  },
  subCommands: {
    migrate: migrateCommand,
  },
})

function parseRuleFilter(value: string | undefined): { include?: RuleId[], exclude?: RuleId[] } | undefined {
  if (!value)
    return undefined
  const include: RuleId[] = []
  const exclude: RuleId[] = []
  for (const raw of value.split(',').map(s => s.trim()).filter(Boolean)) {
    const isExclude = raw.startsWith('!')
    const id = (isExclude ? raw.slice(1) : raw) as RuleId
    if (!allRuleIds.includes(id)) {
      process.stderr.write(`[unhead] unknown rule id: ${id}\n`)
      continue
    }
    if (isExclude)
      exclude.push(id)
    else
      include.push(id)
  }
  return {
    include: include.length ? include : undefined,
    exclude: exclude.length ? exclude : undefined,
  }
}

interface PrintOptions {
  dry: boolean
  check: boolean
}

type Report = Awaited<ReturnType<typeof migrate>>

function printHumanReport(report: Report, opts: PrintOptions): void {
  const stream = process.stdout
  const { entries, files, filesChanged } = report
  if (!entries.length) {
    stream.write(`[unhead] no changes needed across ${files} file(s).\n`)
    return
  }

  const byFile = new Map<string, Report['entries']>()
  for (const entry of entries) {
    const bucket = byFile.get(entry.file) || []
    bucket.push(entry)
    byFile.set(entry.file, bucket)
  }

  for (const [file, group] of byFile) {
    stream.write(`\n${file}\n`)
    for (const e of group) {
      const marker = e.fixed ? '*' : '!'
      stream.write(`  ${marker} ${e.line}:${e.column}  ${e.ruleId}  ${e.message}\n`)
    }
  }

  const verb = opts.dry ? 'would update' : 'updated'
  stream.write(`\n[unhead] ${verb} ${filesChanged} file(s); ${entries.length} rule hit(s) across ${files} scanned file(s).\n`)
  if (opts.check && filesChanged > 0)
    stream.write(`[unhead] --check: changes needed, exiting with code 1.\n`)
}

runMain(mainCommand)
