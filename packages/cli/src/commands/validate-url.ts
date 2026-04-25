import process from 'node:process'
import { defineCommand } from 'citty'
import { jsonReplacer, printReport, validateHtml } from '../validate'

async function fetchHtml(url: string, userAgent: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'user-agent': userAgent,
      'accept': 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  })
  if (!res.ok)
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`)
  return await res.text()
}

export const validateUrlCommand = defineCommand({
  meta: {
    name: 'validate-url',
    description: 'Fetch a rendered URL and run unhead\'s SEO/perf validation rules over its <head>.',
  },
  args: {
    'url': {
      type: 'positional',
      description: 'URL to fetch and validate.',
      required: true,
    },
    'user-agent': {
      type: 'string',
      description: 'User-Agent header to send (default: facebookexternalhit so social-crawler-aware rules engage).',
      default: 'facebookexternalhit/1.1 (+https://unhead.unjs.io)',
    },
    'json': {
      type: 'boolean',
      description: 'Emit JSON instead of human-readable output.',
      default: false,
    },
  },
  async run({ args }) {
    const url = String(args.url)
    const html = await fetchHtml(url, String(args['user-agent']))
    const result = validateHtml(html, url)

    if (args.json)
      process.stdout.write(`${JSON.stringify(result, jsonReplacer, 2)}\n`)
    else
      printReport(result)

    if (result.rules.some(r => r.severity === 'warn'))
      process.exitCode = 1
  },
})
