import process from 'node:process'
import { defineCommand } from 'citty'
import { resolve } from 'pathe'
import { formatResults, runLint } from '../lint'

const DEFAULT_PATTERNS = ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,vue,svelte}']
const DEFAULT_IGNORE = ['**/node_modules/**', '**/dist/**', '**/.output/**', '**/.nuxt/**']

export const migrate = defineCommand({
  meta: {
    name: 'migrate',
    description: 'Apply autofixes for v2-to-v3 migration: rewrite deprecated props and wrap tag literals in defineX helpers.',
  },
  args: {
    'patterns': {
      type: 'positional',
      description: 'File globs to migrate (default: all source files).',
      required: false,
      valueHint: 'glob',
    },
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
    const mode = dryRun ? 'audit' : 'migrate'

    const { results, fixableErrorCount, fixableWarningCount } = await runLint({
      patterns,
      mode,
      cwd,
      ignore: DEFAULT_IGNORE,
    })

    const output = await formatResults(results)
    if (output)
      process.stdout.write(output)

    const fixable = fixableErrorCount + fixableWarningCount
    if (dryRun) {
      console.log(`unhead migrate: ${fixable} fixable issue${fixable === 1 ? '' : 's'} (dry run, no files modified)`)
    }
    else {
      const fixed = results.reduce((n, r) => n + (r.output ? 1 : 0), 0)
      console.log(`unhead migrate: applied fixes to ${fixed} file${fixed === 1 ? '' : 's'}`)
    }
  },
})
