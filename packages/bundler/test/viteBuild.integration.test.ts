import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { describe, expect, it } from 'vitest'
import { Unhead } from '../src/unplugin/vite'

const fixtureDir = fileURLToPath(new URL('./fixtures/vite-build', import.meta.url))
const entry = fileURLToPath(new URL('./fixtures/vite-build/entry.ts', import.meta.url))

function outputCode(result: any): string {
  const outputs = Array.isArray(result) ? result : [result]
  return outputs
    .flatMap((o: any) => o.output ?? [])
    .filter((chunk: any) => chunk.type === 'chunk')
    .map((chunk: any) => chunk.code)
    .join('\n')
}

describe('vite build integration', () => {
  it('client build drops server-only composables', async () => {
    const result = await build({
      root: fixtureDir,
      configFile: false,
      logLevel: 'silent',
      plugins: Unhead({ devtools: false }) as any,
      build: {
        write: false,
        minify: false,
        lib: { entry, formats: ['es'], fileName: 'entry' },
      },
    })
    const code = outputCode(result)
    expect(code).toContain('CLIENT_MARKER')
    expect(code).not.toContain('SERVER_ONLY_MARKER')
  })

  it('ssr build retains server-only composables', async () => {
    const result = await build({
      root: fixtureDir,
      configFile: false,
      logLevel: 'silent',
      plugins: Unhead({ devtools: false }) as any,
      build: {
        write: false,
        minify: false,
        ssr: entry,
      },
    })
    const code = outputCode(result)
    expect(code).toContain('SERVER_ONLY_MARKER')
    expect(code).toContain('CLIENT_MARKER')
  })
})
