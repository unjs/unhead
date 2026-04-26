import { writeFile } from 'node:fs/promises'
import process from 'node:process'
import { defineCommand } from 'citty'
import { resolve } from 'pathe'
import { formatStylish } from '../format'
import { runAudit, summarise } from '../oxc/audit'

const DEFAULT_PATTERNS = ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,vue,svelte}']
const DEFAULT_IGNORE = ['**/node_modules/**', '**/dist/**', '**/.output/**', '**/.nuxt/**']

export const migrate = defineCommand({
  meta: {
    name: 'migrate',
    description: 'Apply autofixes for v2-to-v3 migration: rewrite deprecated props and wrap tag literals in defineX helpers.',
  },
  args: {
    'cwd': {
      type: 'string',
      description: 'Project root.',
      default: '.',
    },
    'dry-run': {
      type: 'boolean',
      description: 'Report what would change without writing files.',
      default: false,
    },
  },
  async run({ args }) {
    const cwd = resolve(process.cwd(), args.cwd)
    const positional = (args._ ?? []).map(String).filter(Boolean)
    const patterns = positional.length > 0 ? positional : DEFAULT_PATTERNS
    const dryRun = args['dry-run'] === true

    const results = await runAudit({
      patterns,
      mode: 'migrate',
      cwd,
      ignore: DEFAULT_IGNORE,
    })

    const output = formatStylish(results, cwd, process.stdout.isTTY ?? false)
    if (output)
      process.stdout.write(output)

    if (dryRun) {
      const fixable = results.reduce((n, r) => n + (r.output ? 1 : 0), 0)
      console.log(`unhead migrate: ${fixable} file${fixable === 1 ? '' : 's'} would be modified (dry run)`)
      return
    }

    let written = 0
    for (const r of results) {
      if (!r.output)
        continue
      await writeFile(r.filePath, r.output)
      written++
    }
    console.log(`unhead migrate: applied fixes to ${written} file${written === 1 ? '' : 's'}`)

    const { errorCount } = summarise(results)
    if (errorCount > 0)
      process.exitCode = 1
  },
})
