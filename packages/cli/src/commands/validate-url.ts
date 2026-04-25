import process from 'node:process'
import { defineCommand } from 'citty'
import { jsonReplacer, printReport, validateHtml } from '../validate'

async function fetchHtml(url: string, userAgent: string, timeoutMs = 30_000): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      headers: {
        'user-agent': userAgent,
        'accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: controller.signal,
    })
    if (!res.ok)
      throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`)
    const ct = res.headers.get('content-type') || ''
    if (ct && !/text\/html|application\/xhtml\+xml/i.test(ct))
      throw new Error(`Unexpected content-type "${ct}" for ${url} (expected HTML)`)
    return await res.text()
  }
  finally {
    clearTimeout(timer)
  }
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
    'timeout': {
      type: 'string',
      description: 'Fetch timeout in milliseconds.',
      default: '30000',
    },
    'json': {
      type: 'boolean',
      description: 'Emit JSON instead of human-readable output.',
      default: false,
    },
  },
  async run({ args }) {
    const url = String(args.url)
    const timeoutMs = Number(args.timeout) || 30_000
    const html = await fetchHtml(url, String(args['user-agent']), timeoutMs)
    const result = validateHtml(html, url)

    if (args.json)
      process.stdout.write(`${JSON.stringify(result, jsonReplacer, 2)}\n`)
    else
      printReport(result)

    // The runtime ValidatePlugin's rule severities are 'warn' | 'info' (no
    // 'error'-tier), so we exit 1 on any 'warn'. CI consumers can downgrade
    // specific rules to 'info' or 'off' via plugin options if they want them
    // non-blocking.
    if (result.rules.some(r => r.severity === 'warn'))
      process.exitCode = 1
  },
})
