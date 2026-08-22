import { useHead as coreUseHead, useSeoMeta as coreUseSeoMeta } from 'unhead'
import { createHead } from 'unhead/server'
import { describe, expect, it } from 'vitest'
import { UseSeoMetaTransform } from '../src/unplugin/UseSeoMetaTransform'

/**
 * Runtime-vs-compiled equivalence suite.
 *
 * Every fixture is rendered twice through the real unhead server runtime:
 * once from the ORIGINAL `useSeoMeta()` call and once from the TRANSFORMED
 * output of the seoMeta lowering. The rendered head tags must be identical,
 * proving the static lowering (including packed nested objects, sanitize
 * semantics and residual per-prop fallbacks) matches runtime `unpackMeta`.
 *
 * The same corpus doubles as an eligibility report: a minimum fully-lowered
 * count is asserted so a future bundle-size "win" can't come from silently
 * narrowing the supported input space.
 */

async function transform(code: string | string[], id = 'some-id.js'): Promise<string | undefined> {
  const plugin = UseSeoMetaTransform.vite({}) as any
  const handler = typeof plugin.transform === 'function' ? plugin.transform : plugin.transform.handler
  const res = await handler.call({}, Array.isArray(code) ? code.join('\n') : code, id)
  return res?.code
}

const IMPORT_LINE_RE = /^import\s.*$/gm
const SEO_META_CALL_RE = /\buse(?:Server)?SeoMeta\s*\(/

/** Evaluates the module body against the real unhead runtime and renders it. */
function render(code: string): string {
  const head = createHead({ disableDefaults: true })
  const body = code.replace(IMPORT_LINE_RE, '')
  const bindings: Record<string, (input: any, options?: any) => any> = {
    useHead: (input, options) => coreUseHead(head, input, options),
    useServerHead: (input, options) => coreUseHead(head, input, options),
    useSeoMeta: (input, options) => coreUseSeoMeta(head, input, options),
    useServerSeoMeta: (input, options) => coreUseSeoMeta(head, input, options),
  }
  // eslint-disable-next-line no-new-func
  new Function(...Object.keys(bindings), body)(...Object.values(bindings))
  return head.render().headTags
}

type Eligibility = 'full' | 'partial' | 'bail'

interface Fixture {
  name: string
  expected: Eligibility
  code: string[]
}

const corpus: Fixture[] = [
  // -- flat -------------------------------------------------------------
  {
    name: 'flat strings',
    expected: 'full',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ title: \'T\', description: \'D\' })',
    ],
  },
  {
    name: 'flat og and twitter keys',
    expected: 'full',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ ogTitle: \'T\', ogDescription: \'D\', ogSiteName: \'Site\', twitterCard: \'summary_large_image\' })',
    ],
  },
  {
    name: 'charset',
    expected: 'full',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ charset: \'utf-8\' })',
    ],
  },
  {
    name: 'title and titleTemplate',
    expected: 'full',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ title: \'T\', titleTemplate: \'%s | Site\', description: \'D\' })',
    ],
  },
  {
    name: 'template literal values',
    expected: 'full',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ title: `Hello`, description: `World` })',
    ],
  },
  {
    name: 'flat http-equiv key',
    expected: 'full',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ contentType: \'text/html; charset=utf-8\' })',
    ],
  },
  {
    name: 'dynamic scalar value inlined',
    expected: 'full',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'const desc = \'dynamic description\'',
      'useSeoMeta({ title: \'T\', description: desc })',
    ],
  },
  // -- nested / packed objects ------------------------------------------
  {
    name: 'robots booleans',
    expected: 'full',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ robots: { noindex: true, nofollow: true } })',
    ],
  },
  {
    name: 'robots numbers and negative numbers',
    expected: 'full',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ robots: { maxSnippet: -1, maxImagePreview: \'large\', maxVideoPreview: 0 } })',
    ],
  },
  {
    name: 'robots false flags dropped like runtime',
    expected: 'full',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ robots: { noindex: false, nofollow: true, maxSnippet: -1 } })',
    ],
  },
  {
    name: 'robots unary plus',
    expected: 'full',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ robots: { maxSnippet: +20 } })',
    ],
  },
  {
    name: 'robots template literal value',
    expected: 'full',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ robots: { unavailableAfter: `2026-01-01` } })',
    ],
  },
  {
    name: 'robots null value',
    expected: 'full',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ robots: { maxSnippet: null, noindex: true } })',
    ],
  },
  {
    name: 'nested arrays and nested objects',
    expected: 'full',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ robots: { all: [\'a\', \'b\'], nested: { level: 2 } } })',
    ],
  },
  {
    name: 'refresh with numeric seconds',
    expected: 'full',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ refresh: { seconds: 3, url: \'https://example.com\' } })',
    ],
  },
  {
    name: 'appleItunesApp with numeric app id',
    expected: 'full',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ appleItunesApp: { appId: 123456789, appArgument: \'https://example.com\' } })',
    ],
  },
  {
    name: 'contentSecurityPolicy',
    expected: 'full',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ contentSecurityPolicy: { defaultSrc: "\'self\'", upgradeInsecureRequests: true } })',
    ],
  },
  // -- media -------------------------------------------------------------
  {
    name: 'media object static',
    expected: 'full',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ ogImage: { url: \'/og.png\', width: 800, height: 600 } })',
    ],
  },
  {
    name: 'media array static',
    expected: 'full',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ twitterImage: [{ url: \'/t.png\', alt: \'hi\' }] })',
    ],
  },
  {
    name: 'media secureUrl mapping',
    expected: 'full',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ ogImage: { url: \'/og.png\', secureUrl: \'/s.png\' } })',
    ],
  },
  // -- mixed -------------------------------------------------------------
  {
    name: 'mixed flat, robots and media',
    expected: 'full',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ title: \'T\', description: \'D\', robots: { noindex: true, maxSnippet: -1 }, ogImage: { url: \'/og.png\', width: 800 } })',
    ],
  },
  {
    name: 'useServerSeoMeta static',
    expected: 'full',
    code: [
      'import { useServerSeoMeta } from \'unhead\'',
      'useServerSeoMeta({ title: \'T\', description: \'D\', robots: { noindex: true } })',
    ],
  },
  // -- partial: residual per-prop fallback --------------------------------
  {
    name: 'residual dynamic media tail (issue #769 shape)',
    expected: 'partial',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'const og = \'/og.png\'',
      'useSeoMeta({ title: \'T\', ogImage: og })',
    ],
  },
  {
    name: 'residual dynamic media tail resolving to an object',
    expected: 'partial',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'const og = { url: \'/og.png\', width: 800 }',
      'useSeoMeta({ title: \'T\', ogImage: og })',
    ],
  },
  {
    name: 'residual dynamic nested tail',
    expected: 'partial',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'const flag = true',
      'useSeoMeta({ description: \'D\', robots: { noindex: flag } })',
    ],
  },
  {
    name: 'residual multi-prop tail keeps source order',
    expected: 'partial',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'const og = \'/og.png\'',
      'const d = \'tail description\'',
      'useSeoMeta({ title: \'T\', ogImage: og, description: d })',
    ],
  },
  // -- bail: whole call left to runtime -----------------------------------
  {
    name: 'bail dynamic first argument',
    expected: 'bail',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'const meta = { description: \'D\' }',
      'useSeoMeta(meta)',
    ],
  },
  {
    name: 'bail spread properties',
    expected: 'bail',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'const extra = { description: \'D\' }',
      'useSeoMeta({ title: \'T\', ...extra })',
    ],
  },
  {
    name: 'bail lowered primitives before a dynamic media tail',
    // og could resolve to an object at runtime; unpackMeta would render it
    // BEFORE description in the original call but a residual entry renders
    // after, so the whole call must stay at runtime.
    expected: 'bail',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'const og = { url: \'/og.png\' }',
      'useSeoMeta({ description: \'D\', ogImage: og })',
    ],
  },
  {
    name: 'bail overlapping dedupe names across split',
    expected: 'bail',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'const og = \'/b.png\'',
      'useSeoMeta({ ogImageUrl: \'/a.png\', ogImage: og })',
    ],
  },
  {
    name: 'bail duplicate key across split boundary',
    expected: 'bail',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'const flag = true',
      'useSeoMeta({ description: \'a\', robots: { noindex: flag }, description: \'b\' })',
    ],
  },
  {
    name: 'bail title after unsupported prop',
    expected: 'bail',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'const flag = true',
      'useSeoMeta({ description: \'D\', robots: { noindex: flag }, title: \'T\' })',
    ],
  },
  {
    name: 'bail options argument with unsupported prop',
    expected: 'bail',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'const og = \'/og.png\'',
      'useSeoMeta({ title: \'T\', ogImage: og }, { tagPriority: 10 })',
    ],
  },
  {
    name: 'bail computed nested key',
    expected: 'bail',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ robots: { [\'no\' + \'index\']: true } })',
    ],
  },
  {
    name: 'bail unsafe prototype nested key',
    expected: 'bail',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ robots: { constructor: \'polluted\' } })',
    ],
  },
  {
    name: 'bail regexp nested value',
    expected: 'bail',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ robots: { pattern: /x/i } })',
    ],
  },
  {
    name: 'bail bigint nested value',
    expected: 'bail',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ robots: { maxSnippet: 1n } })',
    ],
  },
  {
    name: 'bail arrayable meta key object (themeColor)',
    expected: 'bail',
    code: [
      'import { useSeoMeta } from \'unhead\'',
      'useSeoMeta({ themeColor: { color: \'#fff\', media: \'(prefers-color-scheme: dark)\' } })',
    ],
  },
]

function classify(transformed: string | undefined): Eligibility {
  if (transformed === undefined)
    return 'bail'
  return SEO_META_CALL_RE.test(transformed.replace(IMPORT_LINE_RE, '')) ? 'partial' : 'full'
}

describe('seoMeta runtime equivalence', () => {
  for (const fixture of corpus) {
    it(`${fixture.name} [${fixture.expected}]`, async () => {
      const code = fixture.code.join('\n')
      const transformed = await transform(code)
      expect(classify(transformed)).toBe(fixture.expected)
      // rendered output must be byte-identical between the original call and
      // the transformed output (trivially so for whole-call bails)
      expect(render(transformed ?? code)).toBe(render(code))
    })
  }

  it('eligibility summary holds a minimum fully-lowered floor', async () => {
    const counts: Record<Eligibility, number> = { full: 0, partial: 0, bail: 0 }
    const rows: string[] = []
    for (const fixture of corpus) {
      const result = classify(await transform(fixture.code.join('\n')))
      counts[result]++
      rows.push(`  ${result.padEnd(8)}${fixture.name}`)
    }
    // eslint-disable-next-line no-console
    console.log([
      `[seoMeta lowering eligibility] ${counts.full} fully lowered, ${counts.partial} partially lowered (residual), ${counts.bail} runtime-only of ${corpus.length} fixtures`,
      ...rows,
    ].join('\n'))
    // Floors, not exact counts: a future bundle-size "win" must not come from
    // silently narrowing the statically-supported input space.
    expect(counts.full).toBeGreaterThanOrEqual(22)
    expect(counts.full + counts.partial).toBeGreaterThanOrEqual(25)
  })
})
