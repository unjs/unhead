import { createRequire } from 'node:module'
import { parseAndWalk } from 'oxc-walker'

type ParseAndWalkOptions = Exclude<Parameters<typeof parseAndWalk>[2], (...args: any[]) => any>

const PARSER_IDS = ['rolldown/utils', 'oxc-parser'] as const

export type ParserId = typeof PARSER_IDS[number]
export type ParseSync = NonNullable<ParseAndWalkOptions['parseSync']>

interface ParserLoadSuccess {
  _tag: 'ok'
  module: unknown
}

interface ParserLoadError {
  _tag: 'error'
  cause: unknown
}

export type ParserLoadResult = ParserLoadSuccess | ParserLoadError
export type ParserLoader = (id: ParserId) => ParserLoadResult

interface ParserResolutionSuccess {
  _tag: 'ok'
  id: ParserId
  parseSync: ParseSync
}

interface ParserResolutionFailure {
  _tag: 'missing'
  failures: Array<{ cause: unknown, id: ParserId }>
}

export type ParserResolution = ParserResolutionSuccess | ParserResolutionFailure

export interface MissingParserError extends Error {
  _tag: 'MissingParserError'
}

export function resolveParser(load: ParserLoader): ParserResolution {
  const failures: ParserResolutionFailure['failures'] = []

  for (const id of PARSER_IDS) {
    const loaded = load(id)
    if (loaded._tag === 'error') {
      failures.push({ cause: loaded.cause, id })
      continue
    }

    const parseSync = (loaded.module as { parseSync?: unknown })?.parseSync
    if (typeof parseSync === 'function')
      return { _tag: 'ok', id, parseSync: parseSync as ParseSync }

    failures.push({
      cause: new TypeError(`${id} does not export parseSync`),
      id,
    })
  }

  return { _tag: 'missing', failures }
}

const require = createRequire(import.meta.url)
let cachedParser: ParserResolutionSuccess | undefined

function loadParser(id: ParserId): ParserLoadResult {
  try {
    return { _tag: 'ok', module: require(id) }
  }
  catch (cause) {
    return { _tag: 'error', cause }
  }
}

export function resolveParserOrThrow(load: ParserLoader): ParserResolutionSuccess {
  const resolution = resolveParser(load)
  if (resolution._tag === 'missing') {
    throw Object.assign(
      new Error(
        'Unhead build transforms require a parser. Rolldown is detected automatically. If Rolldown is unavailable, install oxc-parser as a development dependency.',
        { cause: new AggregateError(resolution.failures.map(failure => failure.cause), 'Parser resolution failed') },
      ),
      { _tag: 'MissingParserError' as const },
    )
  }

  return resolution
}

function getParser(): ParserResolutionSuccess {
  cachedParser ||= resolveParserOrThrow(loadParser)
  return cachedParser
}

export function isMissingParserError(error: unknown): error is MissingParserError {
  return error instanceof Error
    && '_tag' in error
    && error._tag === 'MissingParserError'
}

export function parseAndWalkSource(code: string, id: string, options: ParseAndWalkOptions): ReturnType<typeof parseAndWalk> {
  return parseAndWalk(code, id, {
    ...options,
    parseSync: getParser().parseSync,
  })
}
