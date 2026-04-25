import type { ValidationOutput } from '../validate'
import { readFile } from 'node:fs/promises'
import process from 'node:process'
import { defineCommand } from 'citty'
import { resolve } from 'pathe'
import { glob } from 'tinyglobby'
import { jsonReplacer, printReport, validateHtml } from '../validate'

const DEFAULT_PATTERNS = ['**/*.html']
const DEFAULT_IGNORE = ['**/node_modules/**']

export const validateHtmlCommand = defineCommand({
  meta: {
    name: 'validate-html',
    description: 'Run the runtime ValidatePlugin over prerendered HTML files (e.g. dist/, .output/, build/).',
  },
  args: {
    patterns: {
      type: 'positional',
      description: 'Glob patterns matching HTML files (default: **/*.html).',
      required: false,
      valueHint: 'glob',
    },
    cwd: {
      type: 'string',
      description: 'Project root.',
      default: '.',
    },
    json: {
      type: 'boolean',
      description: 'Emit JSON instead of human-readable output.',
      default: false,
    },
  },
  async run({ args }) {
    const cwd = resolve(process.cwd(), String(args.cwd))
    const positional = (args._ ?? []).map(String).filter(Boolean)
    const patterns = positional.length > 0 ? positional : DEFAULT_PATTERNS

    const files = await glob(patterns, {
      cwd,
      absolute: true,
      ignore: DEFAULT_IGNORE,
    })

    if (files.length === 0) {
      console.error(`No HTML files matched ${patterns.join(', ')} in ${cwd}`)
      process.exitCode = 1
      return
    }

    const reports: ValidationOutput[] = []
    for (const file of files) {
      const html = await readFile(file, 'utf8')
      reports.push(validateHtml(html, file))
    }

    if (args.json) {
      process.stdout.write(`${JSON.stringify(reports, jsonReplacer, 2)}\n`)
    }
    else {
      for (const report of reports)
        printReport(report)

      const totalIssues = reports.reduce((n, r) => n + r.rules.length, 0)
      const filesWithIssues = reports.filter(r => r.rules.length > 0).length
      console.log(`\n${filesWithIssues}/${files.length} file${files.length === 1 ? '' : 's'} with issues, ${totalIssues} total`)
    }

    if (reports.some(r => r.rules.some(rule => rule.severity === 'warn')))
      process.exitCode = 1
  },
})
