import type { RollupOptions } from 'rollup'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import nodeResolve from '@rollup/plugin-node-resolve'
import { transform } from 'esbuild'
import { rollup } from 'rollup'
import { defineBuildConfig } from 'unbuild'
import { build as viteBuild } from 'vite'

const IIFE_GLOBAL_NAME = '__unhead_iife__'
const IIFE_INIT_CALL = `${IIFE_GLOBAL_NAME}.init();`
const EAGER_RENDERER = { __UNHEAD_LAZY_RENDERER__: 'false' }
const IIFE_TYPES = `export declare const streamingIifeCode: string;
/** Use with a client adapter from the same Unhead version. */
export declare const streamingIifeCodeWithDeferredEvents: string;
export declare const streamingIifeSize: number;
`
const IIFE_ENTRY = 'virtual:unhead-streaming-iife'
type IifeInitializer = 'init' | 'initWithDeferredEvents'
// Rollup transform plugins use text prefilters and replacements before parsing.
// Escape their trigger text in the module source so the IIFE remains opaque data.
const IIFE_ROLLUP_TRANSFORM_TOKENS = [
  'BroadcastChannel',
  'Buffer',
  'PerformanceObserver',
  'clearImmediate',
  'global',
  'performance',
  'process',
  'setImmediate',
  'typeof window',
] as const
const IIFE_ROLLUP_TRANSFORM_RE = new RegExp(IIFE_ROLLUP_TRANSFORM_TOKENS.join('|'), 'g')

function makeExecutableIifeCode(code: string) {
  return `${code}${code.endsWith(';') ? '' : ';'}${IIFE_INIT_CALL}`
}

export function serializeIifeCode(code: string) {
  return JSON.stringify(code).replace(IIFE_ROLLUP_TRANSFORM_RE, (match) => {
    const firstChar = match.charCodeAt(0).toString(16).padStart(4, '0')
    return `\\u${firstChar}${match.slice(1)}`
  })
}

function isFirstSideEffectWarning(warning: { message?: string }) {
  return warning.message?.startsWith('First side effect in ') === true
}

function writeIifeArtifacts(rootDir: string, code: string, codeWithDeferredEvents: string) {
  writeFileSync(resolve(rootDir, 'dist/stream/iife.global.js'), code)
  writeFileSync(
    resolve(rootDir, 'dist/stream/iife.mjs'),
    `export const streamingIifeCode = ${serializeIifeCode(code)};\nexport const streamingIifeCodeWithDeferredEvents = ${serializeIifeCode(codeWithDeferredEvents)};\nexport const streamingIifeSize = ${code.length};\n`,
  )
  writeFileSync(resolve(rootDir, 'dist/stream/iife.d.ts'), IIFE_TYPES)
  writeFileSync(resolve(rootDir, 'dist/stream/iife.d.mts'), IIFE_TYPES)
  writeFileSync(resolve(rootDir, 'dist/stream/iife.d.cts'), IIFE_TYPES)
}

function iifeEntry(entry: string, path: string, initializer: IifeInitializer) {
  const id = `\0${entry}`
  return {
    name: 'unhead-streaming-iife',
    resolveId(source: string) {
      if (source === entry)
        return id
    },
    load(source: string) {
      if (source === id)
        return `export { ${initializer} as init } from ${JSON.stringify(path)}`
    },
  }
}

async function buildIifeFromDist(rootDir: string, initializer: IifeInitializer) {
  const bundle = await rollup({
    input: IIFE_ENTRY,
    plugins: [iifeEntry(IIFE_ENTRY, resolve(rootDir, 'dist/stream/iife.mjs'), initializer), nodeResolve()],
  })
  try {
    const { output } = await bundle.generate({ format: 'iife', name: IIFE_GLOBAL_NAME })
    const chunk = output.find(item => item.type === 'chunk')
    if (!chunk)
      throw new Error('[unhead] Failed to build streaming IIFE.')
    return chunk.code
  }
  finally {
    await bundle.close()
  }
}

async function buildIifeFromSource(rootDir: string, initializer: IifeInitializer) {
  const entry = resolve(rootDir, IIFE_ENTRY)
  const result = await viteBuild({
    define: EAGER_RENDERER,
    build: {
      emptyOutDir: false,
      lib: {
        entry,
        formats: ['iife'],
        name: IIFE_GLOBAL_NAME,
      },
      minify: false,
      write: false,
    },
    configFile: false,
    logLevel: 'silent',
    plugins: [iifeEntry(entry, resolve(rootDir, 'src/stream/iife.ts'), initializer)],
    root: rootDir,
  })
  const output = (Array.isArray(result) ? result : [result]).flatMap((item) => {
    if (!('output' in item))
      throw new Error('[unhead] Failed to build streaming IIFE.')
    return item.output
  })
  const chunk = output.find(item => item.type === 'chunk')
  if (!chunk)
    throw new Error('[unhead] Failed to build streaming IIFE.')
  return chunk.code
}

const WALK_RESOLVER = resolve(__dirname, 'src/utils/walkResolver.ts')

// Framework `useHead` composables import `walkResolver` from `unhead/utils`, so it is in the
// eager chunk of an app. The lazy build imports it from there too, so the runtime chunk of
// the app reuses that copy.
function shareWalkResolver(_: unknown, options: RollupOptions) {
  (options.plugins as any[]).unshift({
    name: 'unhead:lazy-share-walk-resolver',
    async resolveId(this: any, source: string, importer?: string) {
      if (!importer || !source.endsWith('/walkResolver'))
        return null
      const resolved = await this.resolve(source, importer, { skipSelf: true })
      return resolved?.id === WALK_RESOLVER ? { id: 'unhead/utils', external: true } : null
    },
  })
}

function failOnSideEffects(_: unknown, options: RollupOptions) {
  options.experimentalLogSideEffects = true
  const onwarn = options.onwarn
  options.onwarn = (warning, warn) => {
    if (isFirstSideEffectWarning(warning))
      throw new Error(warning.message)
    if (onwarn)
      return onwarn(warning, warn)
    warn(warning)
  }
}

export default defineBuildConfig([{
  // The lazy head builds first and alone, so it shares no dist file with the other entries
  // and leaves their dist as it was. Its runtime chunk holds its own copy of the resolve
  // pipeline, apart from `walkResolver`. The package exports of the next build do not exist
  // yet, so warnings pass here.
  clean: true,
  declaration: true,
  replace: { __UNHEAD_LAZY_RENDERER__: 'true' },
  failOnWarn: false,
  hooks: {
    'rollup:options': (ctx, options) => {
      shareWalkResolver(ctx, options)
      failOnSideEffects(ctx, options)
    },
  },
  entries: [
    { input: 'src/lazy/index', name: 'lazy' },
  ],
}, {
  clean: false,
  declaration: true,
  // Only the separate lazy build needs hydration adoption and stream precedence.
  rollup: {
    esbuild: { define: EAGER_RENDERER, minifySyntax: true },
  },
  hooks: {
    'rollup:options': failOnSideEffects,
    'build:done': async function (ctx) {
      const { rootDir, stub } = ctx.options
      const buildIife = stub ? buildIifeFromSource : buildIifeFromDist
      const [full, deferred] = await Promise.all([
        buildIife(rootDir, 'init'),
        buildIife(rootDir, 'initWithDeferredEvents'),
      ])
      const [minified, minifiedWithDeferredEvents] = await Promise.all(
        [full, deferred].map(code => transform(code, { minify: true, target: 'es2022', legalComments: 'none' })),
      )
      const code = makeExecutableIifeCode(minified.code.trim())
      const codeWithDeferredEvents = makeExecutableIifeCode(minifiedWithDeferredEvents.code.trim())

      writeIifeArtifacts(rootDir, code, codeWithDeferredEvents)
      console.log(`Built streaming IIFE: ${code.length} bytes (${codeWithDeferredEvents.length} with deferred events)`)
    },
  },
  entries: [
    { input: 'src/index', name: 'index' },
    { input: 'src/types/index', name: 'types' },
    { input: 'src/server/index', name: 'server' },
    { input: 'src/client/index', name: 'client' },
    { input: 'src/stream/server', name: 'stream/server' },
    { input: 'src/stream/client', name: 'stream/client' },
    { input: 'src/stream/iife', name: 'stream/iife' },
    { input: 'src/scripts/index', name: 'scripts' },
    { input: 'src/scripts/node', name: 'scripts.node' },
    { input: 'src/scripts/triggers', name: 'scripts/triggers' },
    { input: 'src/utils', name: 'utils' },
    { input: 'src/plugins/index', name: 'plugins' },
    { input: 'src/legacy/index', name: 'legacy' },
    { input: 'src/minify/index', name: 'minify' },
    { input: 'src/parser/index', name: 'parser' },
    { input: 'src/validate/index', name: 'validate' },
    { input: 'src/stream/unplugin', name: 'stream/unplugin' },
    { input: 'src/stream/vite', name: 'stream/vite' },
    { input: 'src/vite/index', name: 'vite' },
  ],
}])
