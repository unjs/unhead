import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import nodeResolve from '@rollup/plugin-node-resolve'
import { rollup } from 'rollup'
import { defineBuildConfig } from 'unbuild'
import { build as viteBuild } from 'vite'

const COMMENT_RE = /\/\*[\s\S]*?\*\/|\/\/.*/g
const WHITESPACE_RE = /\s+/g
const IIFE_GLOBAL_NAME = '__unhead_iife__'
const IIFE_INIT_CALL = `${IIFE_GLOBAL_NAME}.init();`
const IIFE_TYPES = 'export declare const streamingIifeCode: string;\nexport declare const streamingIifeSize: number;\n'
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

function minifyIifeCode(code: string) {
  return code.replace(COMMENT_RE, '').replace(WHITESPACE_RE, ' ').trim()
}

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

function writeIifeArtifacts(rootDir: string, code: string) {
  writeFileSync(resolve(rootDir, 'dist/stream/iife.global.js'), code)
  writeFileSync(
    resolve(rootDir, 'dist/stream/iife.mjs'),
    `export const streamingIifeCode = ${serializeIifeCode(code)};\nexport const streamingIifeSize = ${code.length};\n`,
  )
  writeFileSync(resolve(rootDir, 'dist/stream/iife.d.ts'), IIFE_TYPES)
  writeFileSync(resolve(rootDir, 'dist/stream/iife.d.mts'), IIFE_TYPES)
  writeFileSync(resolve(rootDir, 'dist/stream/iife.d.cts'), IIFE_TYPES)
}

async function buildIifeFromDist(rootDir: string) {
  const bundle = await rollup({
    input: resolve(rootDir, 'dist/stream/iife.mjs'),
    plugins: [nodeResolve()],
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

async function buildIifeFromSource(rootDir: string) {
  const result = await viteBuild({
    build: {
      emptyOutDir: false,
      lib: {
        entry: resolve(rootDir, 'src/stream/iife.ts'),
        formats: ['iife'],
        name: IIFE_GLOBAL_NAME,
      },
      minify: false,
      write: false,
    },
    configFile: false,
    logLevel: 'silent',
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

export default defineBuildConfig({
  clean: true,
  declaration: true,
  hooks: {
    'rollup:options': (_, options) => {
      options.experimentalLogSideEffects = true
      const onwarn = options.onwarn
      options.onwarn = (warning, warn) => {
        if (isFirstSideEffectWarning(warning))
          throw new Error(warning.message)
        if (onwarn)
          return onwarn(warning, warn)
        warn(warning)
      }
    },
    'build:done': async function (ctx) {
      const code = makeExecutableIifeCode(minifyIifeCode(ctx.options.stub
        ? await buildIifeFromSource(ctx.options.rootDir)
        : await buildIifeFromDist(ctx.options.rootDir)))

      writeIifeArtifacts(ctx.options.rootDir, code)
      console.log(`Built streaming IIFE: ${code.length} bytes`)
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
  ],
})
