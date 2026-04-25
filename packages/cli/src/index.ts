import { defineCommand, runMain } from 'citty'
import { audit } from './commands/audit'
import { migrate } from './commands/migrate'
import { validateHtmlCommand } from './commands/validate-html'
import { validateUrlCommand } from './commands/validate-url'

const main = defineCommand({
  meta: {
    name: 'unhead',
    description: 'Audit, migrate, and validate unhead head usage.',
  },
  subCommands: {
    'audit': audit,
    'migrate': migrate,
    'validate-html': validateHtmlCommand,
    'validate-url': validateUrlCommand,
  },
})

export function run(): Promise<void> {
  return runMain(main)
}

export { audit, migrate, validateHtmlCommand, validateUrlCommand }
