import process from 'node:process'
import { defineCommand } from 'citty'
import { resolve } from 'pathe'
import { formatResults, runLint } from '../lint'

const DEFAULT_PATTERNS = ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,vue,svelte}']
const DEFAULT_IGNORE = ['**/node_modules/**', '**/dist/**', '**/.output/**', '**/.nuxt/**']

export const audit = defineCommand({
  meta: {
    name: 'audit',
    description: 'Lint your codebase for unhead misuse, type-narrowing issues, and SEO/perf foot-guns.',
  },
  args: {
    cwd: {
      type: 'string',
      description: 'Project root.',
      default: '.',
    },
  },
  async run({ args }) {
    const cwd = resolve(process.cwd(), args.cwd)
    const positional = (args._ ?? []).map(String).filter(Boolean)
    const patterns = positional.length > 0 ? positional : DEFAULT_PATTERNS

    const { results, errorCount, warningCount } = await runLint({ patterns, mode: 'audit', cwd, ignore: DEFAULT_IGNORE })

    const output = await formatResults(results)
    if (output)
      process.stdout.write(output)

    if (errorCount > 0) {
      process.exitCode = 1
    }
    else if (warningCount > 0 && !output) {
      console.log(`unhead audit: ${warningCount} warning${warningCount === 1 ? '' : 's'}`)
    }
  },
})
