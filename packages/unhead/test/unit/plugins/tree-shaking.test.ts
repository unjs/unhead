import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rollup } from 'rollup'
import ts from 'typescript'
import { build as viteBuild } from 'vite'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

const unusedPluginMarkers = [
  'aliasSorting',
  'vbscript:',
  'missing-template-params-plugin',
  'canonicalHost',
  'infer-seo-meta',
  'application/ld+json',
  'entries:resolve',
]

interface GeneratedChunk {
  code: string
  type: 'chunk'
}

interface GeneratedOutput {
  output: unknown[]
}

function isGeneratedOutput(value: unknown): value is GeneratedOutput {
  return typeof value === 'object'
    && value !== null
    && 'output' in value
    && Array.isArray(value.output)
}

function isGeneratedChunk(value: unknown): value is GeneratedChunk {
  return typeof value === 'object'
    && value !== null
    && 'type' in value
    && value.type === 'chunk'
    && 'code' in value
    && typeof value.code === 'string'
}

function getOutputCode(output: unknown) {
  return (Array.isArray(output) ? output : [output])
    .filter(isGeneratedOutput)
    .flatMap(result => result.output)
    .filter(isGeneratedChunk)
    .map(chunk => chunk.code)
    .join('\n')
}

async function bundlePluginConsumer(importName: string) {
  const tempDir = mkdtempSync(join(tmpdir(), 'unhead-plugin-tree-shaking-'))
  try {
    const entry = resolve(tempDir, 'entry.ts')
    writeFileSync(
      entry,
      `import { ${importName} } from 'unhead/plugins'\nglobalThis.__unheadPlugin = ${importName}\n`,
    )

    const output = await viteBuild({
      configFile: false,
      logLevel: 'silent',
      root: tempDir,
      resolve: {
        alias: {
          'unhead/plugins': resolve(packageRoot, 'src/plugins/index.ts'),
        },
      },
      build: {
        minify: false,
        write: false,
        rollupOptions: {
          input: entry,
          treeshake: true,
          output: {
            format: 'es',
          },
        },
      },
    })

    return getOutputCode(output)
  }
  finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

function isFile(path: string) {
  return existsSync(path) && statSync(path).isFile()
}

function resolveTs(id: string, importer?: string) {
  const base = importer && id.startsWith('.')
    ? resolve(dirname(importer), id)
    : isAbsolute(id) ? id : null

  if (!base)
    return null

  for (const candidate of [base, `${base}.ts`, `${base}.mts`, resolve(base, 'index.ts')]) {
    if (isFile(candidate))
      return candidate
  }

  return null
}

function tsSourcePlugin() {
  return {
    name: 'unhead-test-ts-source',
    resolveId(id: string, importer?: string) {
      const resolved = resolveTs(id, importer)
      if (resolved)
        return resolved
      return id.startsWith('.') || isAbsolute(id) ? null : { id, external: true }
    },
    load(id: string) {
      if (!id.endsWith('.ts') && !id.endsWith('.mts'))
        return null

      return ts.transpileModule(readFileSync(id, 'utf8'), {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          sourceMap: false,
        },
      }).outputText
    },
  }
}

async function collectFirstSideEffectLogs(input: string) {
  const logs: string[] = []
  const bundle = await rollup({
    input,
    experimentalLogSideEffects: true,
    onLog(_, log) {
      if (log.message.includes('First side effect in '))
        logs.push(log.message)
    },
    plugins: [
      tsSourcePlugin(),
    ],
  })

  try {
    await bundle.generate({ format: 'es' })
  }
  finally {
    await bundle.close()
  }

  return logs
}

describe('plugins tree shaking', () => {
  it('removes unused plugin modules from a single plugins barrel import', async () => {
    const code = await bundlePluginConsumer('defineHeadPlugin')

    expect(code).toContain('defineHeadPlugin')
    for (const marker of unusedPluginMarkers)
      expect(code).not.toContain(marker)
  })

  it('does not report top-level side effects in the plugins barrel', async () => {
    const logs = await collectFirstSideEffectLogs(resolve(packageRoot, 'src/plugins/index.ts'))

    expect(logs).toEqual([])
  })
})
